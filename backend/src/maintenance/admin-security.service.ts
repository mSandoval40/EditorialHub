import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RequestPrimaryAdminChangeDto } from './dto/request-primary-admin-change.dto';
import { MaintenanceMailService } from './mail.service';

@Injectable()
export class AdminSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MaintenanceMailService,
  ) {}

  async getPrimaryAdminChangeStatus(actorUserId: string) {
    const admin = await this.getPrimaryAdminActor(actorUserId);
    const request = await this.findActiveRequest(admin.id);

    return {
      hasPendingRequest: Boolean(request),
      request: request ? this.mapRequestSummary(request) : null,
    };
  }

  async requestPrimaryAdminChange(actorUserId: string, dto: RequestPrimaryAdminChangeDto) {
    const admin = await this.getPrimaryAdminActor(actorUserId);
    const newEmail = this.normalizeEmail(dto.newEmail);

    this.ensurePasswordsMatch(dto.newPassword, dto.confirmNewPassword);

    if (newEmail === admin.email) {
      throw new BadRequestException(
        'El nuevo correo debe ser distinto al correo actual del ADMIN principal.',
      );
    }

    const currentPasswordIsValid = await compare(dto.currentPassword, admin.passwordHash);

    if (!currentPasswordIsValid) {
      throw new BadRequestException('La contrasena actual del ADMIN no es correcta.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contrasena debe ser distinta a la actual.');
    }

    const activeRequest = await this.findActiveRequest(admin.id);

    if (activeRequest) {
      throw new BadRequestException(
        'Ya existe una solicitud pendiente para cambiar el ADMIN principal. Debes aprobarla, esperar a que venza o cancelarla antes de crear otra.',
      );
    }

    const userWithNewEmail = await this.prisma.user.findUnique({
      where: {
        email: newEmail,
      },
    });

    if (userWithNewEmail && userWithNewEmail.id !== admin.id) {
      throw new BadRequestException(
        'Ya existe otra cuenta registrada con el nuevo correo propuesto.',
      );
    }

    const approvalToken = randomBytes(24).toString('hex');
    const approvalTokenHash = this.hashToken(approvalToken);
    const expiresAt = this.buildExpirationDate(this.getPrimaryAdminChangeTtlMinutes());
    const newPasswordHash = await hash(dto.newPassword, 10);

    const request = await this.prisma.$transaction(async (tx) => {
      const createdRequest = await tx.primaryAdminChangeRequest.create({
        data: {
          requestedByUserId: admin.id,
          currentAdminUserId: admin.id,
          currentAdminEmail: admin.email,
          newAdminEmail: newEmail,
          newPasswordHash,
          approvalTokenHash,
          expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          eventType: 'ADMIN_ACTION',
          entityType: 'primary_admin_change_request',
          entityId: createdRequest.id,
          targetUserId: admin.id,
          metadata: {
            action: 'request-primary-admin-change',
            currentAdminEmail: admin.email,
            newAdminEmail: newEmail,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return createdRequest;
    });

    const approvalUrl = this.buildApprovalUrl(approvalToken);
    const delivery = await this.mailService.sendPrimaryAdminChangeApprovalMail({
      to: admin.email,
      newAdminEmail: newEmail,
      approvalUrl,
      expiresAt,
    });

    return {
      message:
        delivery.mode === 'smtp'
          ? 'Se envio un correo de validacion al ADMIN actual. El cambio no se aplicara hasta aprobarlo desde ese enlace.'
          : 'Se genero la solicitud de cambio. Como este entorno no tiene correo SMTP configurado, el enlace de validacion queda disponible de forma controlada en la respuesta.',
      request: this.mapRequestSummary(request),
      delivery,
    };
  }

  async getPrimaryAdminChangeApproval(token: string) {
    const request = await this.getActiveRequestByToken(token);

    return {
      message:
        'La solicitud sigue vigente. Si confirmas, el ADMIN principal cambiara al nuevo correo capturado.',
      request: this.mapApprovalSummary(request),
    };
  }

  async approvePrimaryAdminChange(token: string) {
    const request = await this.getActiveRequestByToken(token);
    const now = new Date();

    const admin = await this.prisma.user.findUnique({
      where: {
        id: request.currentAdminUserId,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Ya no existe la cuenta ADMIN asociada a esta solicitud.');
    }

    const adminRoles = admin.roles.map((entry) => entry.role.name);

    if (!adminRoles.includes(RoleName.ADMIN)) {
      throw new ForbiddenException(
        'La cuenta objetivo ya no conserva el rol de ADMIN principal.',
      );
    }

    const userWithNewEmail = await this.prisma.user.findUnique({
      where: {
        email: request.newAdminEmail,
      },
    });

    if (userWithNewEmail && userWithNewEmail.id !== admin.id) {
      throw new BadRequestException(
        'El nuevo correo ya fue ocupado por otra cuenta antes de aprobar el cambio.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: {
          userId: admin.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.user.update({
        where: {
          id: admin.id,
        },
        data: {
          email: request.newAdminEmail,
          passwordHash: request.newPasswordHash,
          emailVerifiedAt: admin.emailVerifiedAt ?? now,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.primaryAdminChangeRequest.update({
        where: {
          id: request.id,
        },
        data: {
          approvedAt: now,
          consumedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          eventType: 'ADMIN_ACTION',
          entityType: 'primary_admin_change_request',
          entityId: request.id,
          targetUserId: admin.id,
          metadata: {
            action: 'approve-primary-admin-change',
            previousAdminEmail: request.currentAdminEmail,
            newAdminEmail: request.newAdminEmail,
            approvedAt: now.toISOString(),
          },
        },
      });
    });

    const notifications = await Promise.all([
      this.mailService.sendPrimaryAdminChangeCompletedMail({
        to: request.currentAdminEmail,
        previousAdminEmail: request.currentAdminEmail,
        newAdminEmail: request.newAdminEmail,
        changedAt: now,
      }),
      this.mailService.sendPrimaryAdminChangeCompletedMail({
        to: request.newAdminEmail,
        previousAdminEmail: request.currentAdminEmail,
        newAdminEmail: request.newAdminEmail,
        changedAt: now,
      }),
    ]);

    return {
      message:
        'El cambio de ADMIN principal fue confirmado y ya quedo aplicado dentro del sistema.',
      request: {
        previousAdminEmail: request.currentAdminEmail,
        newAdminEmail: request.newAdminEmail,
        approvedAt: now.toISOString(),
      },
      notifications,
    };
  }

  private async getPrimaryAdminActor(actorUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: actorUserId,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('No se encontro la cuenta administradora solicitante.');
    }

    const roleNames = user.roles.map((entry) => entry.role.name);

    if (!roleNames.includes(RoleName.ADMIN)) {
      throw new ForbiddenException(
        'Solo el ADMIN principal puede solicitar el cambio de administrador.',
      );
    }

    return user;
  }

  private async findActiveRequest(currentAdminUserId: string) {
    await this.expireStaleRequests(currentAdminUserId);

    return this.prisma.primaryAdminChangeRequest.findFirst({
      where: {
        currentAdminUserId,
        cancelledAt: null,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async getActiveRequestByToken(token: string) {
    const approvalTokenHash = this.hashToken(token.trim());
    const request = await this.prisma.primaryAdminChangeRequest.findUnique({
      where: {
        approvalTokenHash,
      },
    });

    if (!request) {
      throw new NotFoundException('La solicitud de cambio de ADMIN no existe o ya no es valida.');
    }

    if (request.cancelledAt || request.consumedAt) {
      throw new BadRequestException('La solicitud ya fue utilizada o cancelada.');
    }

    if (request.expiresAt.getTime() <= Date.now()) {
      await this.prisma.primaryAdminChangeRequest.update({
        where: {
          id: request.id,
        },
        data: {
          cancelledAt: request.cancelledAt ?? new Date(),
        },
      });
      throw new BadRequestException('La solicitud de cambio de ADMIN ya vencio.');
    }

    return request;
  }

  private async expireStaleRequests(currentAdminUserId: string) {
    await this.prisma.primaryAdminChangeRequest.updateMany({
      where: {
        currentAdminUserId,
        cancelledAt: null,
        consumedAt: null,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        cancelledAt: new Date(),
      },
    });
  }

  private mapRequestSummary(
    request: Pick<
      {
        id: string;
        currentAdminEmail: string;
        newAdminEmail: string;
        createdAt: Date;
        expiresAt: Date;
      },
      'id' | 'currentAdminEmail' | 'newAdminEmail' | 'createdAt' | 'expiresAt'
    >,
  ) {
    return {
      id: request.id,
      currentAdminEmail: request.currentAdminEmail,
      newAdminEmail: request.newAdminEmail,
      requestedAt: request.createdAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
    };
  }

  private mapApprovalSummary(request: {
    id: string;
    currentAdminEmail: string;
    newAdminEmail: string;
    createdAt: Date;
    expiresAt: Date;
  }) {
    return {
      id: request.id,
      currentAdminEmail: request.currentAdminEmail,
      newAdminEmail: request.newAdminEmail,
      requestedAt: request.createdAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
    };
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private ensurePasswordsMatch(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('La nueva contrasena y su confirmacion no coinciden.');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildExpirationDate(ttlMinutes: number) {
    return new Date(Date.now() + ttlMinutes * 60 * 1000);
  }

  private getPrimaryAdminChangeTtlMinutes() {
    const raw = Number(process.env.PRIMARY_ADMIN_CHANGE_TTL_MINUTES ?? '30');

    if (!Number.isFinite(raw) || raw <= 0) {
      return 30;
    }

    return raw;
  }

  private buildApprovalUrl(token: string) {
    const baseUrl =
      process.env.FRONTEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

    return `${baseUrl}/confirmar-cambio-admin?token=${encodeURIComponent(token)}`;
  }
}
