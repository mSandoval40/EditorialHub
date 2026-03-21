import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import {
  AuditEventType,
  AuthorApplicationStatus,
  PurchaseStatus,
  RoleName,
  UserStatus,
} from '@prisma/client';
import { existsSync, readdirSync, rmSync } from 'fs';
import { join, relative } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildSocioDescriptor,
  getDefaultSocioCapabilityRoleNames,
  hasSocioPublishingCapability,
} from '../users/socio-profile.util';

type MaintenanceActionOptions = {
  confirmationText?: string;
  simulate: boolean;
  removeUploads: boolean;
};

type BootstrapAdminsPayload = {
  confirmationText?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;
  admin2Email?: string;
  admin2Password?: string;
  admin2FirstName?: string;
  admin2LastName?: string;
};

type AdminBootstrapTarget = {
  label: 'ADMIN' | 'ADMIN_02';
  email: string;
  password: string;
  roles: RoleName[];
  firstName: string;
  lastName: string;
};

const SOFT_CLEAN_CONFIRMATION = 'SOFT_CLEAN_DEV_DATA';
const FACTORY_RESET_CONFIRMATION = 'FACTORY_RESET_DEV';
const BOOTSTRAP_ADMINS_CONFIRMATION = 'BOOTSTRAP_ADMINS';
const BASE_ROLE_NAMES: RoleName[] = [
  ...getDefaultSocioCapabilityRoleNames(),
  RoleName.ADMIN,
  RoleName.ADMIN_02,
];

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      roles,
      users,
      authorProfiles,
      works,
      purchases,
      fileAssets,
      purchaseStatusRows,
      workStatusRows,
      applicationStatusRows,
    ] = await Promise.all([
      this.prisma.role.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          authorProfile: true,
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
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.authorProfile.findMany({
        include: {
          user: {
            include: {
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.work.findMany({
        include: {
          authorProfile: true,
        },
      }),
      this.prisma.purchase.findMany(),
      this.prisma.fileAsset.findMany(),
      this.prisma.purchase.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.work.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.authorProfile.groupBy({
        by: ['applicationStatus'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const uploadsRoot = this.getUploadsRoot();
    const diskFiles = this.listUploadObjectKeys();
    const trackedObjectKeys = new Set(fileAssets.map((asset) => asset.objectKey));
    const usersWithoutRoles = users.filter((user) => user.roles.length === 0);
    const usersWithAuthorRoleWithoutProfile = users.filter(
      (user) =>
        hasSocioPublishingCapability(user.roles.map((entry) => entry.role.name)) &&
        !user.authorProfile,
    );
    const approvedAuthorWithoutRole = authorProfiles.filter(
      (profile) =>
        profile.applicationStatus === AuthorApplicationStatus.APPROVED &&
        !profile.user.roles.some((entry) => entry.role.name === RoleName.AUTHOR),
    );
    const worksMissingRequiredAssets = works.filter((work) => {
      const assets = this.extractAssets(work.metadata);
      return !assets.cover || !assets.manuscript;
    });
    const fileAssetsMissingOnDisk = fileAssets.filter((asset) => {
      const filePath = join(process.cwd(), 'uploads', ...asset.objectKey.split('/'));
      return !existsSync(filePath);
    });
    const uploadsNotTracked = diskFiles.filter((objectKey) => !trackedObjectKeys.has(objectKey));
    const socioSegments = this.buildSocioSegmentOverview(users);

    return {
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        backendPublicBaseUrl:
          process.env.BACKEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001',
        uploadsRoot,
        allowDestructiveActions: this.allowDestructiveActions(),
      },
      counts: {
        roles: roles.length,
        users: users.length,
        socios: users.length,
        admins: users.filter((user) =>
          user.roles.some(
            (entry) =>
              entry.role.name === RoleName.ADMIN || entry.role.name === RoleName.ADMIN_02,
          ),
        ).length,
        authorProfiles: authorProfiles.length,
        works: works.length,
        purchases: purchases.length,
        fileAssets: fileAssets.length,
        uploadFilesOnDisk: diskFiles.length,
      },
      breakdown: {
        socioSegments,
        purchaseStatuses: purchaseStatusRows.map((row) => ({
          status: row.status,
          total: row._count._all,
        })),
        workStatuses: workStatusRows.map((row) => ({
          status: row.status,
          total: row._count._all,
        })),
        authorApplications: applicationStatusRows.map((row) => ({
          status: row.applicationStatus,
          total: row._count._all,
        })),
      },
      health: {
        usersWithoutRoles: {
          total: usersWithoutRoles.length,
          examples: usersWithoutRoles.slice(0, 5).map((user) => user.email),
        },
        usersWithAuthorRoleWithoutProfile: {
          total: usersWithAuthorRoleWithoutProfile.length,
          examples: usersWithAuthorRoleWithoutProfile
            .slice(0, 5)
            .map((user) => user.email),
        },
        approvedAuthorWithoutRole: {
          total: approvedAuthorWithoutRole.length,
          examples: approvedAuthorWithoutRole
            .slice(0, 5)
            .map((profile) => profile.user.email),
        },
        worksMissingRequiredAssets: {
          total: worksMissingRequiredAssets.length,
          examples: worksMissingRequiredAssets
            .slice(0, 5)
            .map((work) => ({ id: work.id, title: work.title, status: work.status })),
        },
        fileAssetsMissingOnDisk: {
          total: fileAssetsMissingOnDisk.length,
          examples: fileAssetsMissingOnDisk
            .slice(0, 5)
            .map((asset) => asset.objectKey),
        },
        uploadsNotTracked: {
          total: uploadsNotTracked.length,
          examples: uploadsNotTracked.slice(0, 5),
        },
      },
        admins: users
        .filter((user) =>
          user.roles.some(
            (entry) =>
              entry.role.name === RoleName.ADMIN || entry.role.name === RoleName.ADMIN_02,
          ),
        )
        .map((user) => ({
          id: user.id,
          email: user.email,
          status: user.status,
          roles: user.roles.map((entry) => entry.role.name),
          socioCategory: buildSocioDescriptor({
            roleNames: user.roles.map((entry) => entry.role.name),
            createdWorkCount: user.createdWorks.length,
            confirmedPurchaseCount: user.purchases.length,
          }).primaryAdministrativeLabel,
        })),
    };
  }

  async cleanupOrphanedUploads(simulate = true) {
    const trackedObjectKeys = new Set(
      (
        await this.prisma.fileAsset.findMany({
          select: {
            objectKey: true,
          },
        })
      ).map((asset) => asset.objectKey),
    );

    const orphans = this.listUploadObjectKeys().filter(
      (objectKey) => !trackedObjectKeys.has(objectKey),
    );

    if (!simulate) {
      for (const objectKey of orphans) {
        const filePath = join(process.cwd(), 'uploads', ...objectKey.split('/'));

        if (existsSync(filePath)) {
          rmSync(filePath, { force: true });
        }
      }
    }

    return {
      ok: true,
      action: simulate ? 'simulate-orphaned-upload-cleanup' : 'execute-orphaned-upload-cleanup',
      totalOrphans: orphans.length,
      examples: orphans.slice(0, 20),
      removed: simulate ? 0 : orphans.length,
    };
  }

  async softCleanDevelopmentData(actorUserId: string, options: MaintenanceActionOptions) {
    this.ensureDestructiveActionAllowed();
    this.ensureConfirmation(options.confirmationText, SOFT_CLEAN_CONFIRMATION);

    const adminUserIds = await this.getAdministrativeUserIds();
    const diskFilesBefore = this.listUploadObjectKeys();
    const uploadFilesToRemove = options.removeUploads ? diskFilesBefore.length : 0;

    if (options.simulate) {
      return {
        ok: true,
        action: 'simulate-soft-clean',
        preserveAdminUserIds: adminUserIds,
        usersToDelete:
          await this.prisma.user.count({
            where: {
              id: {
                notIn: adminUserIds,
              },
            },
          }),
        worksToDelete: await this.prisma.work.count(),
        purchasesToDelete: await this.prisma.purchase.count(),
        fileAssetsToDelete: await this.prisma.fileAsset.count(),
        uploadFilesToRemove,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({});
      await tx.downloadAttempt.deleteMany({});
      await tx.downloadKey.deleteMany({});
      await tx.paymentAttempt.deleteMany({});
      await tx.purchaseItem.deleteMany({});
      await tx.purchase.deleteMany({});
      await tx.workEdition.deleteMany({});
      await tx.work.deleteMany({});
      await tx.payoutRequest.deleteMany({});
      await tx.authorProfile.deleteMany({});
      await tx.passwordResetCode.deleteMany({});
      await tx.emailVerificationCode.deleteMany({});
      await tx.fileAsset.deleteMany({});
      await tx.userRole.deleteMany({
        where: {
          userId: {
            notIn: adminUserIds,
          },
        },
      });
      await tx.userProfile.deleteMany({
        where: {
          userId: {
            notIn: adminUserIds,
          },
        },
      });
      await tx.user.deleteMany({
        where: {
          id: {
            notIn: adminUserIds,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'maintenance',
          entityId: 'soft-clean',
          targetUserId: actorUserId,
          metadata: {
            action: 'soft-clean',
            preservedAdmins: adminUserIds,
            removeUploads: options.removeUploads,
          },
        },
      });
    });

    if (options.removeUploads) {
      this.removeUploadFiles();
    }

    return {
      ok: true,
      action: 'execute-soft-clean',
      preservedAdminUserIds: adminUserIds,
      removedUploads: options.removeUploads ? uploadFilesToRemove : 0,
    };
  }

  async factoryReset(actorUserId: string, options: MaintenanceActionOptions) {
    this.ensureDestructiveActionAllowed();
    this.ensureConfirmation(options.confirmationText, FACTORY_RESET_CONFIRMATION);

    const uploadFilesBefore = this.listUploadObjectKeys().length;

    if (options.simulate) {
      return {
        ok: true,
        action: 'simulate-factory-reset',
        usersToDelete: await this.prisma.user.count(),
        worksToDelete: await this.prisma.work.count(),
        purchasesToDelete: await this.prisma.purchase.count(),
        fileAssetsToDelete: await this.prisma.fileAsset.count(),
        uploadFilesToRemove: options.removeUploads ? uploadFilesBefore : 0,
        rolesToSeed: BASE_ROLE_NAMES,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({});
      await tx.downloadAttempt.deleteMany({});
      await tx.downloadKey.deleteMany({});
      await tx.paymentAttempt.deleteMany({});
      await tx.purchaseItem.deleteMany({});
      await tx.purchase.deleteMany({});
      await tx.workEdition.deleteMany({});
      await tx.work.deleteMany({});
      await tx.payoutRequest.deleteMany({});
      await tx.authorProfile.deleteMany({});
      await tx.passwordResetCode.deleteMany({});
      await tx.emailVerificationCode.deleteMany({});
      await tx.userProfile.deleteMany({});
      await tx.userRole.deleteMany({});
      await tx.user.deleteMany({});
      await tx.fileAsset.deleteMany({});
      await tx.role.deleteMany({});
    });

    await this.ensureBaseRoles();

    if (options.removeUploads) {
      this.removeUploadFiles();
    }

    return {
      ok: true,
      action: 'execute-factory-reset',
      removedUploads: options.removeUploads ? uploadFilesBefore : 0,
      rolesSeeded: BASE_ROLE_NAMES,
      warning:
        'El usuario que ejecuto esta accion ya no conserva la sesion anterior. Debes volver a bootstrapear administradores.',
      actorUserId,
    };
  }

  async bootstrapAdmins(actorUserId: string, payload: BootstrapAdminsPayload) {
    this.ensureConfirmation(payload.confirmationText, BOOTSTRAP_ADMINS_CONFIRMATION);

    const targets = this.buildBootstrapTargets(payload);
    await this.ensureBaseRoles();
    const roles = await this.prisma.role.findMany({
      where: {
        name: {
          in: BASE_ROLE_NAMES,
        },
      },
    });
    const rolesByName = new Map(roles.map((role) => [role.name, role]));
    const createdAdmins = [];

    for (const target of targets) {
      const passwordHash = await hash(target.password, 10);
      const now = new Date();
      const user = await this.prisma.user.upsert({
        where: {
          email: target.email,
        },
        update: {
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
        create: {
          email: target.email,
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
      });

      await this.prisma.userProfile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          firstName: target.firstName,
          lastName: target.lastName,
        },
        create: {
          userId: user.id,
          firstName: target.firstName,
          lastName: target.lastName,
        },
      });

      for (const roleName of target.roles) {
        const role = rolesByName.get(roleName);

        if (!role) {
          throw new BadRequestException(`No se encontro el rol ${roleName}.`);
        }

        await this.prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: role.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }

      createdAdmins.push({
        label: target.label,
        userId: user.id,
        email: user.email,
        roles: target.roles,
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        eventType: AuditEventType.ADMIN_ACTION,
        entityType: 'maintenance',
        entityId: 'bootstrap-admins',
        targetUserId: actorUserId,
        metadata: {
          action: 'bootstrap-admins',
          createdAdmins,
        },
      },
    });

    return {
      ok: true,
      action: 'bootstrap-admins',
      admins: createdAdmins,
    };
  }

  private buildBootstrapTargets(payload: BootstrapAdminsPayload): AdminBootstrapTarget[] {
    const targets: AdminBootstrapTarget[] = [];

    if (payload.adminEmail && payload.adminPassword) {
      targets.push({
        label: 'ADMIN',
        email: this.normalizeEmail(payload.adminEmail),
        password: payload.adminPassword,
        roles: [...getDefaultSocioCapabilityRoleNames(), RoleName.ADMIN],
        firstName: payload.adminFirstName?.trim() || 'Admin',
        lastName: payload.adminLastName?.trim() || 'EditorialHub',
      });
    }

    if (payload.admin2Email && payload.admin2Password) {
      targets.push({
        label: 'ADMIN_02',
        email: this.normalizeEmail(payload.admin2Email),
        password: payload.admin2Password,
        roles: [...getDefaultSocioCapabilityRoleNames(), RoleName.ADMIN_02],
        firstName: payload.admin2FirstName?.trim() || 'Admin',
        lastName: payload.admin2LastName?.trim() || 'Dos',
      });
    }

    if (targets.length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un administrador con correo y contrasena.',
      );
    }

    return targets;
  }

  private extractAssets(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {
        cover: null,
        manuscript: null,
      };
    }

    const assets = (metadata as Record<string, unknown>).assets;

    if (!assets || typeof assets !== 'object' || Array.isArray(assets)) {
      return {
        cover: null,
        manuscript: null,
      };
    }

    const normalizedAssets = assets as Record<string, unknown>;

    return {
      cover: normalizedAssets.cover ?? null,
      manuscript: normalizedAssets.manuscript ?? null,
    };
  }

  private listUploadObjectKeys() {
    const uploadsRoot = this.getUploadsRoot();

    if (!existsSync(uploadsRoot)) {
      return [] as string[];
    }

    return this.listFilesRecursively(uploadsRoot).map((filePath) =>
      relative(uploadsRoot, filePath).replace(/\\/g, '/'),
    );
  }

  private listFilesRecursively(directoryPath: string): string[] {
    const collected: string[] = [];

    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const fullPath = join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        collected.push(...this.listFilesRecursively(fullPath));
      } else {
        collected.push(fullPath);
      }
    }

    return collected;
  }

  private removeUploadFiles() {
    const uploadsRoot = this.getUploadsRoot();

    if (!existsSync(uploadsRoot)) {
      return;
    }

    for (const entry of readdirSync(uploadsRoot, { withFileTypes: true })) {
      const fullPath = join(uploadsRoot, entry.name);
      rmSync(fullPath, { recursive: true, force: true });
    }
  }

  private getUploadsRoot() {
    return join(process.cwd(), 'uploads');
  }

  private allowDestructiveActions() {
    return (process.env.NODE_ENV || 'development').toLowerCase() !== 'production';
  }

  private ensureDestructiveActionAllowed() {
    if (!this.allowDestructiveActions()) {
      throw new ForbiddenException(
        'Las acciones destructivas de mantenimiento estan bloqueadas en produccion.',
      );
    }
  }

  private ensureConfirmation(receivedText: string | undefined, expectedText: string) {
    if (receivedText !== expectedText) {
      throw new BadRequestException(
        `Confirmacion invalida. Debes escribir exactamente ${expectedText}.`,
      );
    }
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private async ensureBaseRoles() {
    for (const roleName of BASE_ROLE_NAMES) {
      await this.prisma.role.upsert({
        where: {
          name: roleName,
        },
        update: {},
        create: {
          name: roleName,
        },
      });
    }
  }

  private async getAdministrativeUserIds() {
    const admins = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: [RoleName.ADMIN, RoleName.ADMIN_02],
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return admins.map((admin) => admin.id);
  }

  private buildSocioSegmentOverview(
    users: Array<{
      roles: Array<{ role: { name: RoleName } }>;
      createdWorks: Array<{ id: string }>;
      purchases: Array<{ id: string }>;
    }>,
  ) {
    const summary = new Map<string, number>([
      ['Socio', 0],
      ['Socio lector', 0],
      ['Socio autor', 0],
      ['Socio mixto', 0],
      ['Socio con actividad editorial', 0],
    ]);

    users.forEach((user) => {
      const category = buildSocioDescriptor({
        roleNames: user.roles.map((entry) => entry.role.name),
        createdWorkCount: user.createdWorks.length,
        confirmedPurchaseCount: user.purchases.length,
      }).primaryAdministrativeLabel;
      summary.set(category, (summary.get(category) ?? 0) + 1);
    });

    return Array.from(summary.entries()).map(([label, total]) => ({
      label,
      total,
    }));
  }

}
