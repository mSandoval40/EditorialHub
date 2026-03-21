import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType,
  LoyaltyLevel,
  Prisma,
  PurchaseStatus,
  RoleName,
} from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RoyaltiesService } from '../royalties/royalties.service';
import {
  buildAuthorLoyaltySnapshot,
  loyaltyLevelLabel,
} from '../authors/author-loyalty.util';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import {
  buildSocioDescriptor,
  getDefaultSocioCapabilityRoleNames,
} from './socio-profile.util';

const userDetailInclude = {
  profile: true,
  authorProfile: {
    include: {
      works: {
        select: {
          status: true,
        },
      },
      bankValidationAttempts: {
        orderBy: {
          createdAt: 'desc' as const,
        },
        take: 1,
      },
    },
  },
  roles: {
    include: {
      role: true,
    },
  },
  createdWorks: {
    select: {
      id: true,
    },
  },
  purchases: {
    where: {
      status: PurchaseStatus.CONFIRMED,
    },
    select: {
      id: true,
    },
  },
};

type UserDetail = Prisma.UserGetPayload<{
  include: typeof userDetailInclude;
}>;
type UserRoyaltiesSummary = ReturnType<RoyaltiesService['getEmptySummary']>;

type UploadedUserAvatarFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  filename?: string;
  path?: string;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly royaltiesService: RoyaltiesService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userDetailInclude,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const royaltiesSummaries = await this.royaltiesService.buildBatchSummaries(
      user.authorProfile?.id ? [user.authorProfile.id] : [],
      {
        includeBuyerEmail: true,
        recentSalesLimit: 3,
        payoutHistoryLimit: 3,
      },
    );

    return this.mapUser(user, royaltiesSummaries);
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userDetailInclude,
    });

    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const normalizedPublicBio = this.normalizeOptionalString(dto.publicBio);

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        firstName: this.normalizeOptionalString(dto.firstName),
        lastName: this.normalizeOptionalString(dto.lastName),
        phone: this.normalizeOptionalString(dto.phone),
        country: this.normalizeOptionalString(dto.country),
        publicBio: normalizedPublicBio,
        publicPreferences: this.normalizeOptionalString(dto.publicPreferences),
        showAvatar: typeof dto.showAvatar === 'boolean' ? dto.showAvatar : undefined,
        showPublicBio:
          typeof dto.showPublicBio === 'boolean' ? dto.showPublicBio : undefined,
        showPublicPreferences:
          typeof dto.showPublicPreferences === 'boolean'
            ? dto.showPublicPreferences
            : undefined,
      },
      create: {
        userId,
        firstName: this.normalizeOptionalString(dto.firstName),
        lastName: this.normalizeOptionalString(dto.lastName),
        phone: this.normalizeOptionalString(dto.phone),
        country: this.normalizeOptionalString(dto.country),
        publicBio: normalizedPublicBio,
        publicPreferences: this.normalizeOptionalString(dto.publicPreferences),
        showAvatar: dto.showAvatar ?? false,
        showPublicBio: dto.showPublicBio ?? false,
        showPublicPreferences: dto.showPublicPreferences ?? false,
      },
    });

    if (currentUser.authorProfile) {
      await this.prisma.authorProfile.update({
        where: { id: currentUser.authorProfile.id },
        data: {
          bio: normalizedPublicBio,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        eventType: AuditEventType.ADMIN_ACTION,
        entityType: 'user_profile',
        entityId: profile.id,
        targetUserId: userId,
        metadata: {
          action: 'self_profile_updated',
          showAvatar: profile.showAvatar,
          showPublicBio: profile.showPublicBio,
          showPublicPreferences: profile.showPublicPreferences,
        },
      },
    });

    return {
      message: 'Tu perfil publico se actualizo correctamente.',
      user: await this.getMe(userId),
    };
  }

  async uploadMyAvatar(userId: string, file: UploadedUserAvatarFile) {
    this.ensureUploadedAvatarFile(file);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      this.removeUploadedAvatarFile(file);
      throw new NotFoundException('Usuario no encontrado.');
    }

    const nextAvatarUrl = this.buildAvatarUrl(file.filename ?? '');
    const previousAvatarUrl = user.profile?.avatarUrl ?? null;

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        avatarUrl: nextAvatarUrl,
      },
      create: {
        userId,
        avatarUrl: nextAvatarUrl,
      },
    });

    if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
      this.removeAvatarByUrl(previousAvatarUrl);
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        eventType: AuditEventType.ADMIN_ACTION,
        entityType: 'user_profile',
        entityId: profile.id,
        targetUserId: userId,
        metadata: {
          action: 'self_avatar_uploaded',
          avatarUrl: nextAvatarUrl,
        },
      },
    });

    return {
      message: 'Tu foto de perfil se actualizo correctamente.',
      user: await this.getMe(userId),
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userDetailInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const royaltiesSummaries = await this.royaltiesService.buildBatchSummaries(
      users
        .map((user) => user.authorProfile?.id)
        .filter((value): value is string => Boolean(value)),
      {
        includeBuyerEmail: true,
        recentSalesLimit: 3,
        payoutHistoryLimit: 3,
      },
    );

    return {
      items: users.map((user) => this.mapUser(user, royaltiesSummaries)),
      total: users.length,
    };
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userDetailInclude,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const royaltiesSummaries = await this.royaltiesService.buildBatchSummaries(
      user.authorProfile?.id ? [user.authorProfile.id] : [],
      {
        includeBuyerEmail: true,
        recentSalesLimit: 3,
        payoutHistoryLimit: 3,
      },
    );

    return this.mapUser(user, royaltiesSummaries);
  }

  async findRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
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
      userId: user.id,
      email: user.email,
      roles: user.roles.map((item) => item.role.name),
    };
  }

  async assignRole(userId: string, roleName: RoleName) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
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

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new InternalServerErrorException(
        `No existe el rol ${roleName} en la base de datos.`,
      );
    }

    const alreadyHasRole = user.roles.some((item) => item.role.name === roleName);

    if (alreadyHasRole) {
      throw new ConflictException(`El usuario ya tiene asignado el rol ${roleName}.`);
    }

    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    return this.findRoles(user.id);
  }

  async removeRole(userId: string, roleName: RoleName) {
    if ((getDefaultSocioCapabilityRoleNames() as readonly RoleName[]).includes(roleName)) {
      throw new BadRequestException(
        'Los roles base internos de un socio no se pueden retirar manualmente.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new InternalServerErrorException(
        `No existe el rol ${roleName} en la base de datos.`,
      );
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException(`El usuario no tiene asignado el rol ${roleName}.`);
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
    });

    return this.findRoles(user.id);
  }

  async assignFavoredSocio(actorUserId: string, userId: string) {
    return this.setFavoredSocioState(actorUserId, userId, true);
  }

  async removeFavoredSocio(actorUserId: string, userId: string) {
    return this.setFavoredSocioState(actorUserId, userId, false);
  }

  async assignDiamondLoyalty(actorUserId: string, userId: string) {
    return this.setDiamondLoyaltyState(actorUserId, userId, true);
  }

  async removeDiamondLoyalty(actorUserId: string, userId: string) {
    return this.setDiamondLoyaltyState(actorUserId, userId, false);
  }

  private async setFavoredSocioState(
    actorUserId: string,
    userId: string,
    nextState: boolean,
  ) {
    const [actor, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          authorProfile: true,
          roles: {
            include: {
              role: true,
            },
          },
          createdWorks: {
            select: {
              id: true,
            },
          },
          purchases: {
            where: {
              status: PurchaseStatus.CONFIRMED,
            },
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    if (!actor) {
      throw new NotFoundException('No se encontro el administrador solicitante.');
    }

    const actorRoles = actor.roles.map((item) => item.role.name);

    if (!actorRoles.includes(RoleName.ADMIN)) {
      throw new BadRequestException(
        'Solo el ADMIN principal puede gestionar la designacion de Socio_Favorecido.',
      );
    }

    if (!targetUser) {
      throw new NotFoundException('Socio no encontrado.');
    }

    const targetRoles = targetUser.roles.map((item) => item.role.name);
    const isAdministrativeTarget =
      targetRoles.includes(RoleName.ADMIN) || targetRoles.includes(RoleName.ADMIN_02);

    if (isAdministrativeTarget) {
      throw new BadRequestException(
        'No se puede asignar Socio_Favorecido a una cuenta administrativa.',
      );
    }

    const timestamp = nextState ? new Date() : null;

    await this.prisma.userProfile.upsert({
      where: {
        userId: targetUser.id,
      },
      update: {
        isFavoredSocio: nextState,
        favoredAssignedAt: timestamp,
        favoredAssignedByUserId: nextState ? actorUserId : null,
      },
      create: {
        userId: targetUser.id,
        isFavoredSocio: nextState,
        favoredAssignedAt: timestamp,
        favoredAssignedByUserId: nextState ? actorUserId : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        eventType: AuditEventType.ADMIN_ACTION,
        entityType: 'socio_profile',
        entityId: targetUser.id,
        targetUserId: targetUser.id,
        metadata: {
          action: nextState ? 'assign_favored_socio' : 'remove_favored_socio',
          targetEmail: targetUser.email,
        },
      },
    });

    return this.findOne(targetUser.id);
  }

  private async setDiamondLoyaltyState(
    actorUserId: string,
    userId: string,
    nextState: boolean,
  ) {
    const [actor, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: userDetailInclude,
      }),
    ]);

    if (!actor) {
      throw new NotFoundException('No se encontro el administrador solicitante.');
    }

    const actorRoles = actor.roles.map((item) => item.role.name);
    if (!actorRoles.includes(RoleName.ADMIN)) {
      throw new BadRequestException(
        'Solo el ADMIN principal puede gestionar Diamante.',
      );
    }

    if (!targetUser || !targetUser.authorProfile) {
      throw new NotFoundException('El socio no tiene perfil colaborador disponible.');
    }

    const royaltiesSummary = await this.royaltiesService.buildSummary(
      targetUser.authorProfile.id,
      {
        includeBuyerEmail: false,
        recentSalesLimit: 1,
        payoutHistoryLimit: 1,
      },
    );
    const snapshot = buildAuthorLoyaltySnapshot({
      publishedWorksCount: Array.isArray(targetUser.authorProfile.works)
        ? targetUser.authorProfile.works.filter((work) => work.status === 'PUBLISHED').length
        : 0,
      confirmedSalesCount: royaltiesSummary.confirmedSalesCount ?? 0,
      hasCompletePublicProfile: Boolean(
        targetUser.authorProfile.bio?.trim() && targetUser.profile?.avatarUrl,
      ),
      manualLevel: nextState ? LoyaltyLevel.DIAMOND : null,
    });
    const nextRatePercent = snapshot.currentRatePercent;
    const assignedAt = nextState ? new Date() : null;

    await this.prisma.authorProfile.update({
      where: { id: targetUser.authorProfile.id },
      data: {
        loyaltyManualLevel: nextState ? LoyaltyLevel.DIAMOND : null,
        loyaltyAssignedAt: assignedAt,
        loyaltyAssignedByUserId: nextState ? actorUserId : null,
        royaltyRatePercent: nextRatePercent,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        eventType: AuditEventType.ADMIN_ACTION,
        entityType: 'author_loyalty',
        entityId: targetUser.authorProfile.id,
        targetUserId: targetUser.id,
        metadata: {
          action: nextState ? 'assign_diamond_loyalty' : 'remove_diamond_loyalty',
          targetEmail: targetUser.email,
          ratePercent: nextRatePercent,
        },
      },
    });

    return this.findOne(targetUser.id);
  }

  private mapUser(
    user: UserDetail,
    royaltiesSummaries?: Map<string, UserRoyaltiesSummary>,
  ) {
    const roleNames = user.roles.map((item) => item.role.name);
    const socioDescriptor = buildSocioDescriptor({
      roleNames,
      createdWorkCount: Array.isArray(user.createdWorks) ? user.createdWorks.length : 0,
      confirmedPurchaseCount: Array.isArray(user.purchases) ? user.purchases.length : 0,
    });

    const royaltiesSummary = user.authorProfile
      ? royaltiesSummaries?.get(user.authorProfile.id) ??
        this.royaltiesService.getEmptySummary()
      : this.royaltiesService.getEmptySummary();
    const loyalty = user.authorProfile
      ? this.buildLoyaltySnapshot(user, royaltiesSummary)
      : null;

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      roles: roleNames,
      accountLabel: socioDescriptor.accountLabel,
      primaryAdministrativeLabel: socioDescriptor.primaryAdministrativeLabel,
      administrativeLabels: socioDescriptor.administrativeLabels,
      activitySummary: socioDescriptor.activity,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            country: user.profile.country,
            avatarUrl: this.resolveAdministrativeAvatarUrl(
              roleNames,
              user.profile.avatarUrl ?? null,
            ),
            publicBio: user.profile.publicBio ?? null,
            publicPreferences: user.profile.publicPreferences ?? null,
            showAvatar: user.profile.showAvatar ?? false,
            showPublicBio: user.profile.showPublicBio ?? false,
            showPublicPreferences: user.profile.showPublicPreferences ?? false,
          }
        : null,
      favoredSocio: {
        isFavored: user.profile?.isFavoredSocio ?? false,
        assignedAt: user.profile?.favoredAssignedAt ?? null,
        assignedByUserId: user.profile?.favoredAssignedByUserId ?? null,
      },
      collaboratorProfile: user.authorProfile
        ? {
            id: user.authorProfile.id,
            publicName: user.authorProfile.publicName,
            bio: user.authorProfile.bio ?? null,
            authorProfileType: user.authorProfile.authorProfileType,
            applicationStatus: user.authorProfile.applicationStatus,
            royaltyRatePercent: loyalty?.currentRatePercent ?? user.authorProfile.royaltyRatePercent?.toString?.() ?? null,
            loyalty,
            rejectionReason: user.authorProfile.rejectionReason ?? null,
            approvedAt: user.authorProfile.approvedAt ?? null,
            rejectedAt: user.authorProfile.rejectedAt ?? null,
            createdAt: user.authorProfile.createdAt,
            updatedAt: user.authorProfile.updatedAt,
            legalName: user.authorProfile.legalName ?? null,
            curp: user.authorProfile.curp ?? null,
            dateOfBirth: user.authorProfile.dateOfBirth ?? null,
            bankValidationStatus:
              this.resolveVisibleBankValidationStatus(
                user.authorProfile.bankValidationStatus,
                user.authorProfile.payoutAccountData,
              ),
            bankValidationReference:
              user.authorProfile.bankValidationReference ?? null,
            bankValidationRequestedAt:
              user.authorProfile.bankValidationRequestedAt ?? null,
            bankValidationNotes: user.authorProfile.bankValidationNotes ?? null,
            bankValidatedAt: user.authorProfile.bankValidatedAt ?? null,
            latestBankValidationAttempt:
              Array.isArray(user.authorProfile.bankValidationAttempts) &&
              user.authorProfile.bankValidationAttempts[0]
                ? {
                    id: user.authorProfile.bankValidationAttempts[0].id,
                    provider: user.authorProfile.bankValidationAttempts[0].provider,
                    amountMinor:
                      user.authorProfile.bankValidationAttempts[0].amountMinor,
                    currency:
                      user.authorProfile.bankValidationAttempts[0].currency,
                    referenceCode:
                      user.authorProfile.bankValidationAttempts[0].referenceCode,
                    status: user.authorProfile.bankValidationAttempts[0].status,
                    sentAt: user.authorProfile.bankValidationAttempts[0].sentAt,
                    confirmedAt:
                      user.authorProfile.bankValidationAttempts[0].confirmedAt,
                    expiresAt:
                      user.authorProfile.bankValidationAttempts[0].expiresAt,
                    verificationAttemptsUsed:
                      user.authorProfile.bankValidationAttempts[0]
                        .verificationAttemptsUsed,
                    maxVerificationAttempts:
                      user.authorProfile.bankValidationAttempts[0]
                        .maxVerificationAttempts,
                    notes: user.authorProfile.bankValidationAttempts[0].notes,
                  }
                : null,
            royaltiesSummary,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private buildLoyaltySnapshot(
    user: UserDetail,
    royaltiesSummary: UserRoyaltiesSummary,
  ) {
    const publishedWorksCount = Array.isArray(user.authorProfile?.works)
      ? user.authorProfile.works.filter((work) => work.status === 'PUBLISHED').length
      : 0;
    const hasCompletePublicProfile = Boolean(
      user.authorProfile?.bio?.trim() && user.profile?.avatarUrl,
    );
    const snapshot = buildAuthorLoyaltySnapshot({
      publishedWorksCount,
      confirmedSalesCount: royaltiesSummary.confirmedSalesCount ?? 0,
      hasCompletePublicProfile,
      manualLevel: user.authorProfile?.loyaltyManualLevel ?? null,
    });

    return {
      level: snapshot.level,
      label: loyaltyLevelLabel(snapshot.level),
      points: snapshot.points,
      currentRatePercent: snapshot.currentRatePercent,
      nextLevel: snapshot.nextLevel,
      nextLevelLabel: snapshot.nextLevelLabel,
      nextLevelRatePercent: snapshot.nextLevelRatePercent,
      pointsToNextLevel: snapshot.pointsToNextLevel,
      progressPercent: snapshot.progressPercent,
      estimatedExtraPer100Mxn: snapshot.estimatedExtraPer100Mxn,
      isManualDiamond: snapshot.isManualDiamond,
      assignedAt: user.authorProfile?.loyaltyAssignedAt ?? null,
      assignedByUserId: user.authorProfile?.loyaltyAssignedByUserId ?? null,
    };
  }

  private normalizeOptionalString(value: string | undefined) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized.length > 0 ? normalized : null;
  }

  private resolveVisibleBankValidationStatus(
    value: string | null | undefined,
    payoutAccountData: unknown,
  ) {
    const bankData = this.extractPayoutAccountData(payoutAccountData);
    const hasCompleteBankData =
      Boolean(bankData.accountHolder) &&
      Boolean(bankData.bankName) &&
      /^[0-9]{18}$/.test(bankData.clabe);

    if (!hasCompleteBankData) {
      return 'MISSING';
    }

    return 'VALIDATED';
  }

  private extractPayoutAccountData(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        accountHolder: '',
        bankName: '',
        clabe: '',
        accountNumber: '',
      };
    }

    const payload = value as Record<string, unknown>;

    return {
      accountHolder:
        typeof payload.accountHolder === 'string' ? payload.accountHolder.trim() : '',
      bankName: typeof payload.bankName === 'string' ? payload.bankName.trim() : '',
      clabe: typeof payload.clabe === 'string' ? payload.clabe.trim() : '',
      accountNumber:
        typeof payload.accountNumber === 'string' ? payload.accountNumber.trim() : '',
    };
  }

  private ensureUploadedAvatarFile(file: UploadedUserAvatarFile) {
    if (!file?.path || !file?.filename) {
      throw new BadRequestException('Debes adjuntar una imagen valida.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      this.removeUploadedAvatarFile(file);
      throw new BadRequestException('La foto de perfil debe ser una imagen.');
    }

    if ((file.size ?? 0) <= 0 || (file.size ?? 0) > MAX_AVATAR_BYTES) {
      this.removeUploadedAvatarFile(file);
      throw new BadRequestException(
        'La foto de perfil debe pesar como maximo 5 MB.',
      );
    }
  }

  private removeUploadedAvatarFile(file: UploadedUserAvatarFile) {
    if (file?.path && existsSync(file.path)) {
      unlinkSync(file.path);
    }
  }

  private buildAvatarUrl(filename: string) {
    const baseUrl = (process.env.API_BASE_URL || 'http://localhost:3001').replace(
      /\/api\/?$/,
      '',
    );
    return `${baseUrl}/uploads/avatars/${filename}`;
  }

  private resolveAdministrativeAvatarUrl(
    roleNames: RoleName[],
    explicitAvatarUrl: string | null,
  ) {
    if (explicitAvatarUrl) {
      return explicitAvatarUrl;
    }

    if (roleNames.includes(RoleName.ADMIN)) {
      return '/profile-images/admin.png';
    }

    if (roleNames.includes(RoleName.ADMIN_02)) {
      return '/profile-images/admin-02.png';
    }

    return null;
  }

  private removeAvatarByUrl(avatarUrl: string) {
    const uploadsPrefix = '/uploads/avatars/';
    const index = avatarUrl.indexOf(uploadsPrefix);

    if (index === -1) {
      return;
    }

    const fileName = avatarUrl.slice(index + uploadsPrefix.length).trim();
    if (!fileName) {
      return;
    }

    const filePath = join(process.cwd(), 'uploads', 'avatars', fileName);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

