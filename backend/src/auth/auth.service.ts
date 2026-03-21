import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuditEventType,
  AuthorApplicationStatus,
  AuthorProfileType,
  UserStatus,
} from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getDefaultSocioCapabilityRoleNames } from '../users/socio-profile.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);

    this.ensurePasswordsMatch(dto.password, dto.confirmPassword);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta registrada con ese correo.');
    }

    const [buyerRole, authorRole] = await Promise.all(
      getDefaultSocioCapabilityRoleNames().map((roleName) =>
        this.prisma.role.findUnique({
          where: { name: roleName },
        }),
      ),
    );

    if (!buyerRole || !authorRole) {
      throw new InternalServerErrorException(
        'No existen los roles base de colaboracion en la base de datos. Ejecuta el seed de roles.',
      );
    }

    const passwordHash = await hash(dto.password, 10);
    const verificationCode = this.generateNumericCode();
    const verificationExpiresAt = this.buildExpirationDate(
      this.getEmailVerificationCodeTtlMinutes(),
    );

    const collaboratorPublicName = this.buildCollaboratorPublicName(email);
    const authorApprovedAt = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          status: UserStatus.PENDING_EMAIL_VERIFICATION,
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: buyerRole.id,
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: authorRole.id,
        },
      });

      const authorProfile = await tx.authorProfile.create({
        data: {
          userId: createdUser.id,
          publicName: collaboratorPublicName,
          authorProfileType: AuthorProfileType.CERTIFIED,
          applicationStatus: AuthorApplicationStatus.APPROVED,
          royaltyRatePercent: '0.00',
          approvedAt: authorApprovedAt,
        },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId: createdUser.id,
          code: verificationCode,
          expiresAt: verificationExpiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: createdUser.id,
          eventType: AuditEventType.USER_REGISTER_STARTED,
          entityType: 'user',
          entityId: createdUser.id,
          targetUserId: createdUser.id,
          metadata: {
            email,
            status: UserStatus.PENDING_EMAIL_VERIFICATION,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: createdUser.id,
          eventType: AuditEventType.AUTHOR_APPLICATION_APPROVED,
          entityType: 'author_profile',
          entityId: authorProfile.id,
          targetUserId: createdUser.id,
          metadata: {
            source: 'auto-collaborator-onboarding',
            publicName: collaboratorPublicName,
            approvedAt: authorApprovedAt.toISOString(),
          },
        },
      });

      return createdUser;
    });

    return {
      message:
        'Cuenta creada correctamente. Tu perfil colaborador ya quedo listo y solo falta verificar tu correo antes de iniciar sesion.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      ...(this.isDevelopmentMode()
        ? {
            verificationCode,
            verificationCodeExpiresAt: verificationExpiresAt.toISOString(),
          }
        : {}),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = this.normalizeEmail(dto.email);
    const code = dto.code.trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('No existe una cuenta con ese correo.');
    }

    if (user.emailVerifiedAt && user.status === UserStatus.ACTIVE) {
      return {
        message: 'El correo ya estaba verificado.',
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      };
    }

    const verificationRecord = await this.prisma.emailVerificationCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verificationRecord) {
      throw new BadRequestException('No hay un código de verificación pendiente para ese correo.');
    }

    if (verificationRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El código de verificación ya venció.');
    }

    if (verificationRecord.attemptsUsed >= verificationRecord.maxAttempts) {
      throw new BadRequestException('El código de verificación agotó sus intentos.');
    }

    if (verificationRecord.code !== code) {
      await this.prisma.emailVerificationCode.update({
        where: { id: verificationRecord.id },
        data: {
          attemptsUsed: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('Código de verificación inválido.');
    }

    const now = new Date();

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      const activatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: now,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          eventType: AuditEventType.USER_EMAIL_VERIFIED,
          entityType: 'user',
          entityId: user.id,
          targetUserId: user.id,
          metadata: {
            email,
            verifiedAt: now.toISOString(),
          },
        },
      });

      return activatedUser;
    });

    return {
      message: 'Correo verificado correctamente.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        status: updatedUser.status,
        emailVerifiedAt: updatedUser.emailVerifiedAt,
      },
    };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordIsValid = await compare(dto.password, user.passwordHash);

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.emailVerifiedAt || user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
      throw new ForbiddenException('Debes verificar tu correo antes de iniciar sesión.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Tu cuenta está suspendida.');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Tu cuenta está bloqueada.');
    }

    const roles = user.roles.map((item) => item.role.name);

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: AuditEventType.USER_LOGIN,
        entityType: 'user',
        entityId: user.id,
        targetUserId: user.id,
        metadata: {
          email: user.email,
          roles,
        },
      },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.getJwtAccessTokenExpiration(),
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        roles,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);

    const genericResponse = {
      message: 'Si el correo existe y está habilitado, se generó un código de recuperación.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return genericResponse;
    }

    if (!user.emailVerifiedAt || user.status !== UserStatus.ACTIVE) {
      return genericResponse;
    }

    const resetCode = this.generateNumericCode();
    const resetExpiresAt = this.buildExpirationDate(
      this.getPasswordResetCodeTtlMinutes(),
    );
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.passwordResetCode.create({
        data: {
          userId: user.id,
          code: resetCode,
          expiresAt: resetExpiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          eventType: AuditEventType.USER_PASSWORD_RECOVERY_REQUESTED,
          entityType: 'user',
          entityId: user.id,
          targetUserId: user.id,
          metadata: {
            email: user.email,
            requestedAt: now.toISOString(),
          },
        },
      });
    });

    return {
      ...genericResponse,
      ...(this.isDevelopmentMode()
        ? {
            resetCode,
            resetCodeExpiresAt: resetExpiresAt.toISOString(),
          }
        : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const code = dto.code.trim();

    this.ensurePasswordsMatch(dto.newPassword, dto.confirmNewPassword);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('No se pudo restablecer la contraseña.');
    }

    const resetRecord = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('No hay un código de recuperación pendiente para ese correo.');
    }

    if (resetRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El código de recuperación ya venció.');
    }

    if (resetRecord.attemptsUsed >= resetRecord.maxAttempts) {
      throw new BadRequestException('El código de recuperación agotó sus intentos.');
    }

    if (resetRecord.code !== code) {
      await this.prisma.passwordResetCode.update({
        where: { id: resetRecord.id },
        data: {
          attemptsUsed: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('Código de recuperación inválido.');
    }

    const newPasswordHash = await hash(dto.newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          eventType: AuditEventType.USER_PASSWORD_RESET,
          entityType: 'user',
          entityId: user.id,
          targetUserId: user.id,
          metadata: {
            email: user.email,
            resetAt: now.toISOString(),
          },
        },
      });
    });

    return {
      message: 'Contraseña actualizada correctamente.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.ensurePasswordsMatch(dto.newPassword, dto.confirmNewPassword);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const currentPasswordIsValid = await compare(dto.currentPassword, user.passwordHash);

    if (!currentPasswordIsValid) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser distinta a la actual.');
    }

    const newPasswordHash = await hash(dto.newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          eventType: AuditEventType.USER_PASSWORD_RESET,
          entityType: 'user',
          entityId: user.id,
          targetUserId: user.id,
          metadata: {
            email: user.email,
            source: 'authenticated-change-password',
            changedAt: now.toISOString(),
          },
        },
      });
    });

    return {
      message: 'La contraseña se actualizó correctamente.',
    };
  }
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      roles: user.roles.map((item) => item.role.name),
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            country: user.profile.country,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private ensurePasswordsMatch(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden.');
    }
  }

  private generateNumericCode() {
    return randomInt(100000, 1000000).toString();
  }

  private buildExpirationDate(ttlInMinutes: number) {
    return new Date(Date.now() + ttlInMinutes * 60 * 1000);
  }

  private buildCollaboratorPublicName(email: string) {
    const localPart = email.split('@')[0] ?? 'colaborador';
    const sanitized = localPart
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) {
      return 'Colaborador EditorialHub';
    }

    return sanitized
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private getEmailVerificationCodeTtlMinutes() {
    const rawValue = process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES || '30';
    const parsedValue = Number(rawValue);

    return Number.isNaN(parsedValue) ? 30 : parsedValue;
  }

  private getPasswordResetCodeTtlMinutes() {
    const rawValue = process.env.PASSWORD_RESET_CODE_TTL_MINUTES || '30';
    const parsedValue = Number(rawValue);

    return Number.isNaN(parsedValue) ? 30 : parsedValue;
  }

  private getJwtAccessTokenExpiration() {
    return process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
  }

  private isDevelopmentMode() {
    return process.env.NODE_ENV !== 'production';
  }
}
