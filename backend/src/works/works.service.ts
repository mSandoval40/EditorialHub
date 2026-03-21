import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType,
  AuthorApplicationStatus,
  AuthorProfileType,
  BankValidationStatus,
  Prisma,
  PurchaseStatus,
  PublicationType,
  RoleName,
  WorkReviewStatus,
  WorkStatus,
} from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { hasSocioPublishingCapability } from '../users/socio-profile.util';
import { ApproveWorkDto } from './dto/approve-work.dto';
import { CancelWorkDto } from './dto/cancel-work.dto';
import { CreateWorkDto } from './dto/create-work.dto';
import { RejectWorkDto } from './dto/reject-work.dto';
import { UpsertWorkEditorialDto } from './dto/upsert-work-editorial.dto';
import { UpsertWorkReviewDto } from './dto/upsert-work-review.dto';
import { UpdateWorkDto } from './dto/update-work.dto';

type WorkWithRelations = Prisma.WorkGetPayload<{
  include: {
    authorProfile: {
      include: {
        user: true;
      };
    };
    createdBy: true;
  };
}>;

type UploadedWorkFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  filename?: string;
  path?: string;
};

type WorkReviewWithRelations = Prisma.WorkReviewGetPayload<{
  include: {
    reviewer: {
      include: {
        profile: true;
        authorProfile: true;
      };
    };
  };
}>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MANUSCRIPT_BYTES = 25 * 1024 * 1024;

@Injectable()
export class WorksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkDto) {
    const authorContext = await this.getApprovedAuthorContext(userId);
    const slug = await this.buildUniqueSlug(dto.title);

    const work = await this.prisma.$transaction(async (tx) => {
      const createdWork = await tx.work.create({
        data: {
          authorProfileId: authorContext.authorProfile.id,
          createdByUserId: userId,
          title: dto.title.trim(),
          slug,
          description: this.normalizeOptionalString(dto.description),
          publicationType: dto.publicationType ?? PublicationType.BOOK,
          status: WorkStatus.DRAFT,
          metadata: this.normalizeJsonField(dto.metadata),
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.workEditorialProfile.create({
        data: {
          workId: createdWork.id,
          favoredEligible: authorContext.user.profile?.isFavoredSocio ?? false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.WORK_CREATED,
          entityType: 'work',
          entityId: createdWork.id,
          targetUserId: userId,
          workId: createdWork.id,
          metadata: {
            title: createdWork.title,
            slug: createdWork.slug,
            status: createdWork.status,
          },
        },
      });

      return createdWork;
    });

    return {
      message: 'Obra creada en borrador.',
      work: this.mapWork(work, { includePrivateManuscript: true }),
    };
  }

  async findMyWorks(userId: string) {
    const authorContext = await this.getApprovedAuthorContext(userId);

    const works = await this.prisma.work.findMany({
      where: {
        authorProfileId: authorContext.authorProfile.id,
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: works.map((work) => this.mapWork(work, { includePrivateManuscript: true })),
      total: works.length,
    };
  }

  async findMyWork(userId: string, workId: string) {
    const authorContext = await this.getApprovedAuthorContext(userId);

    const work = await this.prisma.work.findFirst({
      where: {
        id: workId,
        authorProfileId: authorContext.authorProfile.id,
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Obra no encontrada.');
    }

    return this.mapWork(work, { includePrivateManuscript: true });
  }

  async update(userId: string, workId: string, dto: UpdateWorkDto) {
    const authorContext = await this.getApprovedAuthorContext(userId);

    const work = await this.findOwnedWork(authorContext.authorProfile.id, workId);

    if (work.status !== WorkStatus.DRAFT && work.status !== WorkStatus.REJECTED) {
      throw new BadRequestException(
        'Solo se pueden editar obras en borrador o rechazadas.',
      );
    }

    const nextTitle = dto.title?.trim() ?? work.title;
    const shouldRebuildSlug = typeof dto.title === 'string' && nextTitle !== work.title;
    const nextSlug = shouldRebuildSlug
      ? await this.buildUniqueSlug(nextTitle, work.id)
      : work.slug;

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          title: nextTitle,
          slug: nextSlug,
          description:
            typeof dto.description === 'undefined'
              ? undefined
              : this.normalizeOptionalString(dto.description),
          publicationType: dto.publicationType,
          metadata:
            typeof dto.metadata === 'undefined'
              ? undefined
              : this.normalizeJsonField(dto.metadata),
          status: WorkStatus.DRAFT,
          rejectedAt: null,
          rejectionReason: null,
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.WORK_UPDATED,
          entityType: 'work',
          entityId: result.id,
          targetUserId: userId,
          workId: result.id,
          metadata: {
            title: result.title,
            slug: result.slug,
            status: result.status,
          },
        },
      });

      return result;
    });

    return {
      message: 'Obra actualizada correctamente.',
      work: this.mapWork(updatedWork, { includePrivateManuscript: true }),
    };
  }

  async remove(userId: string, workId: string) {
    const authorContext = await this.getApprovedAuthorContext(userId);
    const work = await this.findOwnedWork(authorContext.authorProfile.id, workId);

    if (work.status !== WorkStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar obras en borrador que aun no han sido enviadas a revision.',
      );
    }

    const assets = this.extractAssets(work.metadata);
    const fileIds = [
      assets.cover?.fileId ?? null,
      assets.backCover?.fileId ?? null,
      assets.manuscript?.fileId ?? null,
    ].filter((item): item is string => Boolean(item));

    const storedAssets = fileIds.length > 0
      ? await this.prisma.fileAsset.findMany({
          where: {
            id: {
              in: fileIds,
            },
          },
        })
      : [];

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'work',
          entityId: work.id,
          targetUserId: userId,
          workId: work.id,
          metadata: {
            action: 'work_deleted_by_author',
            title: work.title,
            slug: work.slug,
            status: work.status,
          },
        },
      });

      if (fileIds.length > 0) {
        await tx.fileAsset.deleteMany({
          where: {
            id: {
              in: fileIds,
            },
          },
        });
      }

      await tx.work.delete({
        where: {
          id: work.id,
        },
      });
    });

    storedAssets.forEach((asset) => {
      this.removeStoredAssetByObjectKey(asset.objectKey);
    });

    return {
      message: 'Obra eliminada correctamente.',
    };
  }

  async uploadCover(userId: string, workId: string, file: UploadedWorkFile) {
    return this.uploadAsset(userId, workId, file, 'cover');
  }

  async uploadBackCover(userId: string, workId: string, file: UploadedWorkFile) {
    return this.uploadAsset(userId, workId, file, 'backCover');
  }

  async uploadManuscript(userId: string, workId: string, file: UploadedWorkFile) {
    return this.uploadAsset(userId, workId, file, 'manuscript');
  }

  async submitForReview(userId: string, workId: string) {
    const authorContext = await this.getApprovedAuthorContext(userId);
    this.ensurePublishingCompliance(authorContext.authorProfile);
    const work = await this.findOwnedWork(authorContext.authorProfile.id, workId);

    if (work.status !== WorkStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden enviar a revisión obras en borrador.',
      );
    }

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          status: WorkStatus.IN_REVIEW,
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.WORK_SUBMITTED_FOR_REVIEW,
          entityType: 'work',
          entityId: result.id,
          targetUserId: userId,
          workId: result.id,
          metadata: {
            title: result.title,
            status: result.status,
          },
        },
      });

      return result;
    });

    return {
      message: 'Obra enviada a revisión.',
      work: this.mapWork(updatedWork, { includePrivateManuscript: true }),
    };
  }

  async listReviewQueue() {
    const works = await this.prisma.work.findMany({
      where: {
        status: WorkStatus.IN_REVIEW,
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      items: works.map((work) => this.mapWork(work, { includePrivateManuscript: true })),
      total: works.length,
    };
  }

  async listModerationQueue() {
    const works = await this.prisma.work.findMany({
      where: {
        status: {
          in: [
            WorkStatus.IN_REVIEW,
            WorkStatus.APPROVED,
            WorkStatus.PUBLISHED,
            WorkStatus.CANCELLED,
          ],
        },
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const workIds = works.map((work) => work.id);
    const [ratingSummaryMap, editorialProfiles] = await Promise.all([
      this.buildWorkReviewSummaryMap(workIds),
      workIds.length > 0
        ? this.prisma.workEditorialProfile.findMany({
            where: {
              workId: {
                in: workIds,
              },
            },
          })
        : Promise.resolve([]),
    ]);
    const editorialMap = new Map(
      editorialProfiles.map((profile) => [profile.workId, profile]),
    );

    return {
      items: works.map((work) =>
        this.attachPublicSignals(
          this.mapWork(work, { includePrivateManuscript: true }),
          ratingSummaryMap.get(work.id),
          editorialMap.get(work.id),
        ),
      ),
      total: works.length,
    };
  }

  async listPublishedWorks() {
    const works = await this.prisma.work.findMany({
      where: {
        status: WorkStatus.PUBLISHED,
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    const workIds = works.map((work) => work.id);
    const [ratingSummaryMap, editorialProfiles] = await Promise.all([
      this.buildWorkReviewSummaryMap(workIds),
      workIds.length > 0
        ? this.prisma.workEditorialProfile.findMany({
            where: {
              workId: {
                in: workIds,
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const editorialMap = new Map(
      editorialProfiles.map((profile) => [profile.workId, profile]),
    );

    return {
      items: works.map((work) =>
        this.attachPublicSignals(
          this.mapWork(work),
          ratingSummaryMap.get(work.id),
          editorialMap.get(work.id),
        ),
      ),
      total: works.length,
    };
  }

  async findPublishedWork(identifier: string) {
    const work = await this.prisma.work.findFirst({
      where: {
        status: WorkStatus.PUBLISHED,
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Obra publicada no encontrada.');
    }

    const [ratingSummaryMap, editorialProfile] = await Promise.all([
      this.buildWorkReviewSummaryMap([work.id]),
      this.prisma.workEditorialProfile.findUnique({
        where: {
          workId: work.id,
        },
      }),
    ]);

    return this.attachPublicSignals(
      this.mapWork(work),
      ratingSummaryMap.get(work.id),
      editorialProfile,
    );
  }

  async listPublishedWorkReviews(identifier: string) {
    const work = await this.findPublishedWorkEntity(identifier);

    const reviews = await this.prisma.workReview.findMany({
      where: {
        workId: work.id,
        status: WorkReviewStatus.PUBLISHED,
      },
      include: {
        reviewer: {
          include: {
            profile: true,
            authorProfile: true,
          },
        },
      },
      orderBy: [{ editorialPinnedOrder: 'asc' }, { editorialFeatured: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      items: reviews.map((review) => this.mapPublicReview(review)),
      total: reviews.length,
    };
  }

  async findMyReview(userId: string, workId: string) {
    const publishedWork = await this.prisma.work.findFirst({
      where: {
        id: workId,
        status: WorkStatus.PUBLISHED,
      },
      select: {
        id: true,
      },
    });

    if (!publishedWork) {
      throw new NotFoundException('Obra publicada no encontrada.');
    }

    const confirmedPurchase = await this.findConfirmedPurchaseForReview(userId, workId);
    const review = await this.prisma.workReview.findUnique({
      where: {
        workId_reviewerUserId: {
          workId,
          reviewerUserId: userId,
        },
      },
    });

    return {
      canReview: Boolean(confirmedPurchase),
      hasPurchased: Boolean(confirmedPurchase),
      review: review
        ? {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          }
        : null,
    };
  }

  async upsertReview(userId: string, workId: string, dto: UpsertWorkReviewDto) {
    const work = await this.prisma.work.findFirst({
      where: {
        id: workId,
        status: WorkStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Solo se pueden reseñar obras publicadas.');
    }

    const confirmedPurchase = await this.findConfirmedPurchaseForReview(userId, workId);

    if (!confirmedPurchase) {
      throw new ForbiddenException(
        'Solo los socios que ya adquirieron esta obra pueden calificarla y comentarla.',
      );
    }

    const rating = Number(dto.rating);
    const comment = dto.comment.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La calificacion debe estar entre 1 y 5 estrellas.');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const savedReview = await tx.workReview.upsert({
        where: {
          workId_reviewerUserId: {
            workId,
            reviewerUserId: userId,
          },
        },
        update: {
          rating,
          comment,
          purchaseId: confirmedPurchase.id,
          status: WorkReviewStatus.PUBLISHED,
        },
        create: {
          workId,
          reviewerUserId: userId,
          purchaseId: confirmedPurchase.id,
          rating,
          comment,
          status: WorkReviewStatus.PUBLISHED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'work_review',
          entityId: savedReview.id,
          targetUserId: userId,
          workId,
          purchaseId: confirmedPurchase.id,
          metadata: {
            action: 'work_review_upserted',
            title: work.title,
            rating,
          },
        },
      });

      return savedReview;
    });

    return {
      message: 'Tu calificacion y comentario se guardaron correctamente.',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    };
  }

  async upsertEditorialLayer(
    actorUserId: string,
    workId: string,
    dto: UpsertWorkEditorialDto,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!actor) {
      throw new NotFoundException('Administrador no encontrado.');
    }

    const actorRoles = actor.roles.map((item) => item.role.name);

    if (!actorRoles.includes(RoleName.ADMIN)) {
      throw new ForbiddenException(
        'Solo el ADMIN principal puede operar la capa editorial favorecida.',
      );
    }

    const work = await this.prisma.work.findUnique({
      where: {
        id: workId,
      },
      include: {
        createdBy: {
          include: {
            profile: true,
          },
        },
        authorProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!work) {
      throw new NotFoundException('Obra no encontrada.');
    }

    const existingEditorialProfile = await this.prisma.workEditorialProfile.findUnique({
      where: {
        workId: work.id,
      },
    });

    const favoredEligible =
      work.createdBy.profile?.isFavoredSocio === true ||
      existingEditorialProfile?.favoredEligible === true;

    if (!favoredEligible) {
      throw new ForbiddenException(
        'Solo se puede activar la capa editorial favorecida sobre obras elegibles de Socio_Favorecido.',
      );
    }

    const payload = {
      editorialBadgeText: this.normalizeOptionalString(dto.editorialBadgeText),
      editorialHeadline: this.normalizeOptionalString(dto.editorialHeadline),
      featuredReviewNote: this.normalizeOptionalString(dto.featuredReviewNote),
      visibleAverageRating:
        typeof dto.visibleAverageRating === 'number'
          ? new Prisma.Decimal(dto.visibleAverageRating.toFixed(2))
          : null,
    };

    const savedProfile = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.workEditorialProfile.upsert({
        where: {
          workId: work.id,
        },
        update: {
          favoredEligible: true,
          ...payload,
        },
        create: {
          workId: work.id,
          favoredEligible: true,
          ...payload,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'work_editorial_profile',
          entityId: profile.id,
          targetUserId: work.createdByUserId,
          workId: work.id,
          metadata: {
            action: 'work_editorial_layer_upserted',
            title: work.title,
            favoredEligible: true,
            visibleAverageRating:
              profile.visibleAverageRating?.toString() ?? null,
          },
        },
      });

      return profile;
    });

    const [summaryMap] = await Promise.all([
      this.buildWorkReviewSummaryMap([work.id]),
    ]);

    return {
      message: 'La capa editorial de esta obra se actualizo correctamente.',
      editorial: this.attachPublicSignals(
        this.mapWork(work),
        summaryMap.get(work.id),
        savedProfile,
      ).editorial,
    };
  }

  async approve(actorUserId: string, workId: string, dto: ApproveWorkDto) {
    const work = await this.findAdminWork(workId);

    if (work.status !== WorkStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Solo se pueden aprobar obras en revisi?n.',
      );
    }

    const assets = this.extractAssets(work.metadata);
    const missingAssets = this.getMissingRequiredAssets(assets);

    if (missingAssets.length > 0) {
      throw new BadRequestException(
        `No se puede aprobar la obra porque faltan archivos obligatorios: ${missingAssets.join(', ')}.`,
      );
    }

    const editorialNotes = dto.editorialNotes?.trim() || null;

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          status: WorkStatus.APPROVED,
          rejectedAt: null,
          rejectionReason: null,
          metadata: this.buildApprovalMetadata(work.metadata, editorialNotes),
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.WORK_APPROVED,
          entityType: 'work',
          entityId: result.id,
          targetUserId: result.createdByUserId,
          workId: result.id,
          metadata: {
            title: result.title,
            status: result.status,
            editorialNotes,
          },
        },
      });

      return result;
    });

    return {
      message: 'Obra aprobada.',
      work: this.mapWork(updatedWork),
    };
  }

  async reject(actorUserId: string, workId: string, dto: RejectWorkDto) {
    const work = await this.findAdminWork(workId);

    if (work.status !== WorkStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Solo se pueden rechazar obras en revisión.',
      );
    }

    const rejectionReason = dto.rejectionReason.trim();
    const resubmittableAfter = new Date(dto.resubmittableAfter);

    if (Number.isNaN(resubmittableAfter.getTime())) {
      throw new BadRequestException('La fecha de reenvio no es valida.');
    }

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          status: WorkStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason,
          metadata: {
            ...(work.metadata && typeof work.metadata === 'object' && !Array.isArray(work.metadata)
              ? (work.metadata as Record<string, unknown>)
              : {}),
            reviewDecision: {
              rejectionReason,
              resubmittableAfter: resubmittableAfter.toISOString(),
            },
          },
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.WORK_REJECTED,
          entityType: 'work',
          entityId: result.id,
          targetUserId: result.createdByUserId,
          workId: result.id,
          metadata: {
            title: result.title,
            status: result.status,
            rejectionReason,
            resubmittableAfter: resubmittableAfter.toISOString(),
          },
        },
      });

      return result;
    });

    return {
      message: 'Obra rechazada.',
      work: this.mapWork(updatedWork),
    };
  }

  async publish(actorUserId: string, workId: string) {
    const work = await this.findAdminWork(workId);
    this.ensurePublishingCompliance(work.authorProfile);

    if (work.status !== WorkStatus.APPROVED) {
      throw new BadRequestException(
        'Solo se pueden publicar obras aprobadas.',
      );
    }

    const now = new Date();
    const manuscriptFileId = this.extractAssetFileId(work.metadata, 'manuscript');

    if (!manuscriptFileId) {
      throw new BadRequestException(
        'No se puede publicar la obra porque no tiene manuscrito asociado.',
      );
    }

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      await tx.workEdition.updateMany({
        where: {
          workId: work.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      await tx.workEdition.upsert({
        where: {
          workId_editionNumber: {
            workId: work.id,
            editionNumber: work.currentEdition,
          },
        },
        update: {
          titleSnapshot: work.title,
          descriptionSnapshot: work.description,
          manuscriptFileId,
          coverFileId: work.coverFileId,
          isActive: true,
          publishedAt: now,
          cancelledAt: null,
        },
        create: {
          workId: work.id,
          editionNumber: work.currentEdition,
          titleSnapshot: work.title,
          descriptionSnapshot: work.description,
          manuscriptFileId,
          coverFileId: work.coverFileId,
          isActive: true,
          publishedAt: now,
        },
      });

      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          status: WorkStatus.PUBLISHED,
          publishedAt: now,
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.WORK_PUBLISHED,
          entityType: 'work',
          entityId: result.id,
          targetUserId: result.createdByUserId,
          workId: result.id,
          metadata: {
            title: result.title,
            status: result.status,
            publishedAt: now.toISOString(),
            editionNumber: result.currentEdition,
          },
        },
      });

      return result;
    });

    return {
      message: 'Obra publicada.',
      work: this.mapWork(updatedWork),
    };
  }

  async cancelPublication(
    actorUserId: string,
    workId: string,
    dto: CancelWorkDto,
  ) {
    const work = await this.findAdminWork(workId);

    if (work.status !== WorkStatus.PUBLISHED) {
      throw new BadRequestException(
        'Solo se pueden retirar del catalogo obras publicadas.',
      );
    }

    const now = new Date();
    const cancellationReason = dto.cancellationReason.trim();

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      await tx.workEdition.updateMany({
        where: {
          workId: work.id,
          isActive: true,
        },
        data: {
          isActive: false,
          cancelledAt: now,
        },
      });

      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          status: WorkStatus.CANCELLED,
          cancelledAt: now,
          metadata: {
            ...(work.metadata && typeof work.metadata === 'object' && !Array.isArray(work.metadata)
              ? (work.metadata as Record<string, unknown>)
              : {}),
            publicationDecision: {
              cancellationReason,
              cancelledAt: now.toISOString(),
            },
          },
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.WORK_CANCELLED,
          entityType: 'work',
          entityId: result.id,
          targetUserId: result.createdByUserId,
          workId: result.id,
          metadata: {
            title: result.title,
            status: result.status,
            cancelledAt: now.toISOString(),
            cancellationReason,
          },
        },
      });

      return result;
    });

    return {
      message: 'Obra retirada del catalogo.',
      work: this.mapWork(updatedWork),
    };
  }

  private async uploadAsset(
    userId: string,
    workId: string,
    file: UploadedWorkFile,
    assetKind: 'cover' | 'backCover' | 'manuscript',
  ) {
    const authorContext = await this.getApprovedAuthorContext(userId);
    const work = await this.findOwnedWork(authorContext.authorProfile.id, workId);

    if (work.status !== WorkStatus.DRAFT && work.status !== WorkStatus.REJECTED) {
      this.removeUploadedFile(file);
      throw new BadRequestException(
        'Solo puedes cargar archivos en obras en borrador o rechazadas.',
      );
    }

    this.ensureUploadedFile(file);
    this.validateAssetFile(file, assetKind);

    const objectKey = `works/${file.filename}`;
    const storageProvider = 'local-dev';
    const asset = await this.prisma.fileAsset.create({
      data: {
        storageProvider,
        objectKey,
        originalName: file.originalname ?? file.filename ?? 'archivo',
        mimeType: file.mimetype ?? 'application/octet-stream',
        sizeBytes: BigInt(file.size ?? 0),
        isPrivate: assetKind === 'manuscript',
        uploadedByUserId: userId,
      },
    });

    const nextMetadata = this.buildNextWorkMetadata(work.metadata, assetKind, {
      fileId: asset.id,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: String(asset.sizeBytes),
      objectKey,
      url: this.buildAssetUrl(asset.id, objectKey, assetKind, work.id),
      uploadedAt: asset.createdAt.toISOString(),
    });

    const updatedWork = await this.prisma.$transaction(async (tx) => {
      const result = await tx.work.update({
        where: {
          id: work.id,
        },
        data: {
          coverFileId: assetKind === 'cover' ? asset.id : undefined,
          metadata: nextMetadata,
        },
        include: {
          authorProfile: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.WORK_UPDATED,
          entityType: 'work',
          entityId: result.id,
          targetUserId: userId,
          workId: result.id,
          metadata: {
            title: result.title,
            status: result.status,
            assetKind,
            fileId: asset.id,
            objectKey,
          },
        },
      });

      return result;
    });

    return {
      message:
        assetKind === 'cover'
          ? 'Portada cargada correctamente.'
          : assetKind === 'backCover'
            ? 'Contraportada cargada correctamente.'
            : 'Manuscrito cargado correctamente.',
      work: this.mapWork(updatedWork, { includePrivateManuscript: true }),
      asset: {
        id: asset.id,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        sizeBytes: String(asset.sizeBytes),
        url: this.buildAssetUrl(asset.id, objectKey, assetKind, work.id),
        uploadedAt: asset.createdAt,
      },
    };
  }

  async prepareWorkManuscriptDownload(userId: string, workId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
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
      throw new NotFoundException('Usuario no encontrado.');
    }

    const work = await this.prisma.work.findUnique({
      where: {
        id: workId,
      },
      include: {
        authorProfile: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Obra no encontrada.');
    }

    const isAdmin = user.roles.some(
      (entry) => entry.role.name === RoleName.ADMIN || entry.role.name === RoleName.ADMIN_02,
    );

    if (!isAdmin && work.createdByUserId !== userId) {
      throw new ForbiddenException('No tienes acceso al manuscrito de esta obra.');
    }

    const manuscriptFileId = this.extractAssetFileId(work.metadata, 'manuscript');

    if (!manuscriptFileId) {
      throw new NotFoundException('La obra no tiene manuscrito cargado.');
    }

    const manuscriptAsset = await this.prisma.fileAsset.findUnique({
      where: {
        id: manuscriptFileId,
      },
    });

    if (!manuscriptAsset) {
      throw new NotFoundException('No se encontro el archivo manuscrito de la obra.');
    }

    const filePath = join(process.cwd(), 'uploads', ...manuscriptAsset.objectKey.split('/'));

    if (!existsSync(filePath)) {
      throw new NotFoundException('El manuscrito no esta disponible en almacenamiento local.');
    }

    return {
      filePath,
      originalName: this.buildWorkDownloadFileName(
        work.title,
        work.id,
        manuscriptAsset.originalName,
      ),
      mimeType: manuscriptAsset.mimeType,
    };
  }

  private buildWorkDownloadFileName(
    title: string,
    workId: string,
    originalName: string | null,
  ) {
    const extension = this.extractFileExtension(originalName);
    const normalizedTitle = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');

    const safeTitle = normalizedTitle || 'obra_editorialhub';
    return `${safeTitle}_editorialhub-${workId}${extension}`;
  }

  private extractFileExtension(originalName: string | null) {
    if (!originalName) {
      return '.pdf';
    }

    const sanitizedName = originalName.trim();
    const dotIndex = sanitizedName.lastIndexOf('.');

    if (dotIndex === -1) {
      return '.pdf';
    }

    const extension = sanitizedName.slice(dotIndex);
    return /^[.][a-zA-Z0-9]+$/.test(extension) ? extension.toLowerCase() : '.pdf';
  }

  private async findPublishedWorkEntity(identifier: string) {
    const work = await this.prisma.work.findFirst({
      where: {
        status: WorkStatus.PUBLISHED,
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Obra publicada no encontrada.');
    }

    return work;
  }

  private async findConfirmedPurchaseForReview(userId: string, workId: string) {
    return this.prisma.purchase.findFirst({
      where: {
        buyerId: userId,
        status: PurchaseStatus.CONFIRMED,
        items: {
          some: {
            workId,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
      select: {
        id: true,
      },
    });
  }

  private async buildWorkReviewSummaryMap(workIds: string[]) {
    if (workIds.length === 0) {
      return new Map<string, ReturnType<WorksService['createEmptyRatingSummary']>>();
    }

    const groupedRows = await this.prisma.workReview.groupBy({
      by: ['workId', 'rating'],
      where: {
        workId: {
          in: workIds,
        },
        status: WorkReviewStatus.PUBLISHED,
      },
      _count: {
        _all: true,
      },
    });

    const summaryMap = new Map<string, ReturnType<WorksService['createEmptyRatingSummary']>>();

    for (const workId of workIds) {
      summaryMap.set(workId, this.createEmptyRatingSummary());
    }

    groupedRows.forEach((row) => {
      const summary = summaryMap.get(row.workId) ?? this.createEmptyRatingSummary();
      const count = row._count._all;
      summary.totalReviews += count;
      summary.totalScore += row.rating * count;
      summary.breakdown[row.rating as 1 | 2 | 3 | 4 | 5] = count;
      summaryMap.set(row.workId, summary);
    });

    summaryMap.forEach((summary) => {
      summary.organicAverage =
        summary.totalReviews > 0
          ? Number((summary.totalScore / summary.totalReviews).toFixed(2))
          : null;
    });

    return summaryMap;
  }

  private createEmptyRatingSummary() {
    return {
      organicAverage: null as number | null,
      totalReviews: 0,
      totalScore: 0,
      breakdown: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }

  private attachPublicSignals(
    work: ReturnType<WorksService['mapWork']>,
    ratingSummary?: ReturnType<WorksService['createEmptyRatingSummary']>,
    editorialProfile?: {
      favoredEligible: boolean;
      editorialBadgeText: string | null;
      editorialHeadline: string | null;
      visibleAverageRating: Prisma.Decimal | null;
      featuredReviewNote: string | null;
    } | null,
  ) {
    const organicSummary = ratingSummary ?? this.createEmptyRatingSummary();
    const visibleAverage =
      editorialProfile?.visibleAverageRating !== null &&
      typeof editorialProfile?.visibleAverageRating !== 'undefined'
        ? Number(editorialProfile.visibleAverageRating.toString())
        : organicSummary.organicAverage;

    return {
      ...work,
      ratings: {
        organicAverage: organicSummary.organicAverage,
        visibleAverage,
        totalReviews: organicSummary.totalReviews,
        breakdown: organicSummary.breakdown,
      },
      editorial: {
        favoredEligible: editorialProfile?.favoredEligible ?? false,
        editorialBadgeText: editorialProfile?.editorialBadgeText ?? null,
        editorialHeadline: editorialProfile?.editorialHeadline ?? null,
        featuredReviewNote: editorialProfile?.featuredReviewNote ?? null,
        hasVisibleRatingOverride:
          editorialProfile?.visibleAverageRating !== null &&
          typeof editorialProfile?.visibleAverageRating !== 'undefined',
      },
    };
  }

  private mapPublicReview(review: WorkReviewWithRelations) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      editorialFeatured: review.editorialFeatured,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewerDisplayName: this.buildReviewerDisplayName(review),
      reviewerLabel: 'Socio verificado',
    };
  }

  private buildReviewerDisplayName(review: WorkReviewWithRelations) {
    const firstName = review.reviewer.profile?.firstName?.trim() ?? '';
    const lastName = review.reviewer.profile?.lastName?.trim() ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (fullName) {
      return fullName;
    }

    const publicName = review.reviewer.authorProfile?.publicName?.trim() ?? '';
    if (publicName) {
      return publicName;
    }

    return 'Socio de EditorialHub';
  }

  private async getApprovedAuthorContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        authorProfile: true,
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

    const roleNames = user.roles.map((item) => item.role.name);
    const hasAuthorRole = hasSocioPublishingCapability(roleNames);
    const needsProvisioning =
      !hasAuthorRole ||
      !user.authorProfile ||
      user.authorProfile.applicationStatus !== AuthorApplicationStatus.APPROVED;

    if (needsProvisioning) {
      const authorRole = await this.prisma.role.findUnique({
        where: { name: RoleName.AUTHOR },
      });

      if (!authorRole) {
        throw new ConflictException('No existe el rol AUTHOR en la base de datos.');
      }

      const approvedAt = new Date();
      const authorProfile = await this.prisma.$transaction(async (tx) => {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: authorRole.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: authorRole.id,
          },
        });

        const profile = await tx.authorProfile.upsert({
          where: {
            userId: user.id,
          },
          update: {
            publicName: user.authorProfile?.publicName || this.buildCollaboratorPublicName(user.email),
            authorProfileType:
              user.authorProfile?.authorProfileType ?? AuthorProfileType.CERTIFIED,
            applicationStatus: AuthorApplicationStatus.APPROVED,
            royaltyRatePercent:
              user.authorProfile?.royaltyRatePercent?.toString?.() ?? '0.00',
            approvedAt: user.authorProfile?.approvedAt ?? approvedAt,
            rejectedAt: null,
            rejectionReason: null,
          },
          create: {
            userId: user.id,
            publicName: this.buildCollaboratorPublicName(user.email),
            authorProfileType: AuthorProfileType.CERTIFIED,
            applicationStatus: AuthorApplicationStatus.APPROVED,
            royaltyRatePercent: '0.00',
            approvedAt,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            eventType: AuditEventType.ADMIN_ACTION,
            entityType: 'author_profile',
            entityId: profile.id,
            targetUserId: user.id,
            metadata: {
              action: 'author_profile_auto_provisioned',
              source: 'works-access',
              publicName: profile.publicName,
            },
          },
        });

        return profile;
      });

      return {
        user,
        authorProfile,
      };
    }

    return {
      user,
      authorProfile: user.authorProfile,
    };
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

  private async findOwnedWork(authorProfileId: string, workId: string) {
    const work = await this.prisma.work.findFirst({
      where: {
        id: workId,
        authorProfileId,
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Obra no encontrada.');
    }

    return work;
  }

  private async findAdminWork(workId: string) {
    const work = await this.prisma.work.findUnique({
      where: {
        id: workId,
      },
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
    });

    if (!work) {
      throw new NotFoundException('Obra no encontrada.');
    }

    return work;
  }

  private normalizeOptionalString(value?: string) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeJsonField(
    value?: Record<string, unknown>,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private ensureUploadedFile(file: UploadedWorkFile) {
    if (!file?.filename || !file?.path) {
      throw new BadRequestException('No se recibio ningun archivo para cargar.');
    }
  }

  private validateAssetFile(
    file: UploadedWorkFile,
    assetKind: 'cover' | 'backCover' | 'manuscript',
  ) {
    const mimeType = (file.mimetype ?? '').toLowerCase();
    const size = file.size ?? 0;

    const imageMimeTypes = ['image/jpeg', 'image/png'];
    const manuscriptMimeTypes = [
      'application/pdf',
      'application/epub+zip',
    ];

    if (
      (assetKind === 'cover' || assetKind === 'backCover') &&
      !imageMimeTypes.includes(mimeType)
    ) {
      this.removeUploadedFile(file);
      throw new BadRequestException(
        'Portada y contraportada solo aceptan JPG o PNG.',
      );
    }

    if (
      (assetKind === 'cover' || assetKind === 'backCover') &&
      size > MAX_IMAGE_BYTES
    ) {
      this.removeUploadedFile(file);
      throw new BadRequestException(
        'Portada y contraportada no deben exceder 5 MB.',
      );
    }

    if (assetKind === 'manuscript' && !manuscriptMimeTypes.includes(mimeType)) {
      this.removeUploadedFile(file);
      throw new BadRequestException(
        'El manuscrito solo acepta PDF o ePub.',
      );
    }

    if (assetKind === 'manuscript' && size > MAX_MANUSCRIPT_BYTES) {
      this.removeUploadedFile(file);
      throw new BadRequestException(
        'El manuscrito no debe exceder 25 MB.',
      );
    }
  }

  private removeUploadedFile(file: UploadedWorkFile) {
    if (file?.path) {
      try {
        unlinkSync(file.path);
      } catch {
        // Ignore cleanup errors in local development.
      }
    }
  }

  private removeStoredAssetByObjectKey(objectKey?: string | null) {
    if (!objectKey) {
      return;
    }

    const filePath = join(process.cwd(), 'uploads', ...objectKey.split('/'));

    if (!existsSync(filePath)) {
      return;
    }

    try {
      unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors in local development.
    }
  }

  private buildNextWorkMetadata(
    currentMetadata: Prisma.JsonValue | null,
    assetKind: 'cover' | 'backCover' | 'manuscript',
    assetPayload: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const baseMetadata =
      currentMetadata && typeof currentMetadata === 'object' && !Array.isArray(currentMetadata)
        ? ({ ...(currentMetadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    const currentAssets =
      baseMetadata.assets &&
      typeof baseMetadata.assets === 'object' &&
      !Array.isArray(baseMetadata.assets)
        ? ({ ...(baseMetadata.assets as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    currentAssets[assetKind] = assetPayload;
    baseMetadata.assets = currentAssets;

    return baseMetadata as Prisma.InputJsonValue;
  }

  private buildApprovalMetadata(
    currentMetadata: Prisma.JsonValue | null,
    editorialNotes: string | null,
  ): Prisma.InputJsonValue {
    const baseMetadata =
      currentMetadata && typeof currentMetadata === 'object' && !Array.isArray(currentMetadata)
        ? ({ ...(currentMetadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    baseMetadata.editorialDecision = {
      ...(baseMetadata.editorialDecision &&
      typeof baseMetadata.editorialDecision === 'object' &&
      !Array.isArray(baseMetadata.editorialDecision)
        ? (baseMetadata.editorialDecision as Record<string, unknown>)
        : {}),
      approvedAt: new Date().toISOString(),
      editorialNotes,
    };

    return baseMetadata as Prisma.InputJsonValue;
  }

  private async buildUniqueSlug(title: string, workIdToExclude?: string) {
    const baseSlug = this.slugify(title);
    let candidate = baseSlug;
    let counter = 2;

    while (await this.slugExists(candidate, workIdToExclude)) {
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private async slugExists(slug: string, workIdToExclude?: string) {
    const existing = await this.prisma.work.findFirst({
      where: {
        slug,
        ...(workIdToExclude
          ? {
              id: {
                not: workIdToExclude,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return Boolean(existing);
  }

  private slugify(value: string) {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || `obra-${Date.now()}`;
  }

  private mapWork(work: WorkWithRelations, options?: { includePrivateManuscript?: boolean }) {
    const assets = this.extractAssets(work.metadata);
    const includePrivateManuscript = options?.includePrivateManuscript ?? false;

    const normalizedAssets = {
      ...assets,
      manuscript: assets.manuscript
        ? includePrivateManuscript
          ? {
              ...assets.manuscript,
              url: this.buildProtectedManuscriptUrl(work.id),
            }
          : null
        : null,
    };

    return {
      id: work.id,
      authorProfileId: work.authorProfileId,
      createdByUserId: work.createdByUserId,
      createdByEmail: work.createdBy?.email ?? null,
      authorPublicName: work.authorProfile?.publicName ?? null,
      authorUserEmail: work.authorProfile?.user?.email ?? null,
      title: work.title,
      slug: work.slug,
      description: work.description,
      publicationType: work.publicationType,
      status: work.status,
      currentEdition: work.currentEdition,
      publishedAt: work.publishedAt,
      rejectedAt: work.rejectedAt,
      rejectionReason: work.rejectionReason,
      cancelledAt: work.cancelledAt,
      cancellationReason: this.extractCancellationReason(work.metadata),
      editorialNotes: this.extractEditorialNotes(work.metadata),
      coverFileId: work.coverFileId,
      assets: normalizedAssets,
      metadata: this.sanitizeMetadataForResponse(work.metadata, work.id, includePrivateManuscript),
      resubmittableAfter: this.extractResubmittableAfter(work.metadata),
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };
  }

  private extractResubmittableAfter(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const reviewDecision = (metadata as Record<string, unknown>).reviewDecision;

    if (
      !reviewDecision ||
      typeof reviewDecision !== 'object' ||
      Array.isArray(reviewDecision)
    ) {
      return null;
    }

    const value = (reviewDecision as Record<string, unknown>).resubmittableAfter;
    return typeof value === 'string' ? value : null;
  }

  private extractCancellationReason(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const publicationDecision = (metadata as Record<string, unknown>).publicationDecision;

    if (
      !publicationDecision ||
      typeof publicationDecision !== 'object' ||
      Array.isArray(publicationDecision)
    ) {
      return null;
    }

    const value = (publicationDecision as Record<string, unknown>).cancellationReason;
    return typeof value === 'string' ? value : null;
  }

  private extractEditorialNotes(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const editorialDecision = (metadata as Record<string, unknown>).editorialDecision;

    if (
      !editorialDecision ||
      typeof editorialDecision !== 'object' ||
      Array.isArray(editorialDecision)
    ) {
      return null;
    }

    const value = (editorialDecision as Record<string, unknown>).editorialNotes;
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private extractAssets(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {
        cover: null,
        backCover: null,
        manuscript: null,
      };
    }

    const assets = (metadata as Record<string, unknown>).assets;

    if (!assets || typeof assets !== 'object' || Array.isArray(assets)) {
      return {
        cover: null,
        backCover: null,
        manuscript: null,
      };
    }

    const typedAssets = assets as Record<string, unknown>;

    return {
      cover: this.normalizeAsset(typedAssets.cover),
      backCover: this.normalizeAsset(typedAssets.backCover),
      manuscript: this.normalizeAsset(typedAssets.manuscript),
    };
  }

  private getMissingRequiredAssets(assets: {
    cover: ReturnType<WorksService['normalizeAsset']>;
    backCover: ReturnType<WorksService['normalizeAsset']>;
    manuscript: ReturnType<WorksService['normalizeAsset']>;
  }) {
    const missing: string[] = [];

    if (!assets.cover) {
      missing.push('portada');
    }

    if (!assets.manuscript) {
      missing.push('manuscrito');
    }

    return missing;
  }

  private extractAssetFileId(
    metadata: Prisma.JsonValue | null,
    assetKind: 'cover' | 'backCover' | 'manuscript',
  ) {
    const assets = this.extractAssets(metadata);
    const asset =
      assetKind === 'cover'
        ? assets.cover
        : assetKind === 'backCover'
          ? assets.backCover
          : assets.manuscript;

    return asset?.fileId ?? null;
  }

  private normalizeAsset(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const asset = value as Record<string, unknown>;
    const fileId = typeof asset.fileId === 'string' ? asset.fileId : null;
    const originalName =
      typeof asset.originalName === 'string' ? asset.originalName : null;
    const mimeType = typeof asset.mimeType === 'string' ? asset.mimeType : null;
    const sizeBytes = typeof asset.sizeBytes === 'string' ? asset.sizeBytes : null;
    const url = typeof asset.url === 'string' ? asset.url : null;
    const uploadedAt =
      typeof asset.uploadedAt === 'string' ? asset.uploadedAt : null;

    if (!fileId || !originalName || !mimeType || !sizeBytes || !url) {
      return null;
    }

    return {
      fileId,
      originalName,
      mimeType,
      sizeBytes,
      url,
      uploadedAt,
    };
  }

  private buildFileUrl(objectKey: string) {
    const baseUrl =
      process.env.BACKEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
      'http://localhost:3001';

    return `${baseUrl}/uploads/${objectKey}`;
  }

  private buildProtectedManuscriptUrl(workId: string) {
    const baseUrl =
      process.env.BACKEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
      'http://localhost:3001';

    return `${baseUrl}/api/works/${workId}/assets/manuscript`;
  }

  private buildAssetUrl(
    _fileId: string,
    objectKey: string,
    assetKind: 'cover' | 'backCover' | 'manuscript',
    workId: string,
  ) {
    if (assetKind === 'manuscript') {
      return this.buildProtectedManuscriptUrl(workId);
    }

    return this.buildFileUrl(objectKey);
  }

  private sanitizeMetadataForResponse(
    metadata: Prisma.JsonValue | null,
    workId: string,
    includePrivateManuscript: boolean,
  ) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return metadata;
    }

    const normalizedMetadata = { ...(metadata as Record<string, unknown>) };

    if (
      normalizedMetadata.assets &&
      typeof normalizedMetadata.assets === 'object' &&
      !Array.isArray(normalizedMetadata.assets)
    ) {
      const normalizedAssets = {
        ...(normalizedMetadata.assets as Record<string, unknown>),
      };

      if (
        normalizedAssets.manuscript &&
        typeof normalizedAssets.manuscript === 'object' &&
        !Array.isArray(normalizedAssets.manuscript)
      ) {
        if (includePrivateManuscript) {
          normalizedAssets.manuscript = {
            ...(normalizedAssets.manuscript as Record<string, unknown>),
            url: this.buildProtectedManuscriptUrl(workId),
          };
        } else {
          delete normalizedAssets.manuscript;
        }
      }

      normalizedMetadata.assets = normalizedAssets;
    }

    return normalizedMetadata;
  }

  private ensurePublishingCompliance(authorProfile: {
    legalName?: string | null;
    curp?: string | null;
    dateOfBirth?: Date | string | null;
    payoutMethod?: string | null;
    payoutAccountData?: Prisma.JsonValue | null;
    bankValidationStatus?: BankValidationStatus | null;
  }) {
    const payoutAccountData = this.extractPayoutAccountData(authorProfile.payoutAccountData);
    const missingFields: string[] = [];

    if (!this.normalizeOptionalString(authorProfile.legalName ?? undefined)) {
      missingFields.push('nombre o razon social');
    }

    if (!this.normalizeCurp(authorProfile.curp).length) {
      missingFields.push('CURP');
    }

    if (!this.normalizeDateValue(authorProfile.dateOfBirth)) {
      missingFields.push('fecha de nacimiento');
    }

    if (!this.normalizeOptionalString(authorProfile.payoutMethod ?? undefined)) {
      missingFields.push('metodo de pago');
    }

    if (!payoutAccountData.accountHolder) {
      missingFields.push('titular bancario');
    }

    if (!payoutAccountData.bankName) {
      missingFields.push('banco');
    }

    if (!this.isValidClabe(payoutAccountData.clabe)) {
      missingFields.push('CLABE valida de 18 digitos');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Completa el perfil de colaborador y los datos bancarios antes de publicar. Faltan: ${missingFields.join(', ')}.`,
      );
    }

  }

  private extractPayoutAccountData(value: Prisma.JsonValue | null | undefined) {
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

  private normalizeTaxId(value?: string | null) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim().toUpperCase();
  }

  private normalizeCurp(value?: string | null) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim().toUpperCase();
  }

  private normalizeDateValue(value?: Date | string | null) {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isValidClabe(value: string) {
    return /^[0-9]{18}$/.test(value);
  }
}
