import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType,
  AuthorApplicationStatus,
  AuthorProfileType,
  BankValidationAttemptStatus,
  BankValidationStatus,
  Prisma,
  RoleName,
  TaxIdSource,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RoyaltiesService } from '../royalties/royalties.service';
import {
  buildAuthorLoyaltySnapshot,
  loyaltyLevelLabel,
} from './author-loyalty.util';
import { ApplyAuthorDto } from './dto/apply-author.dto';
import { ConfirmBankMicrodepositDto } from './dto/confirm-bank-microdeposit.dto';
import { ReviewBankValidationDto } from './dto/review-bank-validation.dto';
import { ReviewAuthorApplicationDto } from './dto/review-author-application.dto';

const authorProfileDetailInclude = {
  user: {
    include: {
      profile: true,
    },
  },
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
};

type AuthorProfileDetail = Prisma.AuthorProfileGetPayload<{
  include: typeof authorProfileDetailInclude;
}>;

type AuthorRoyaltiesSummary = ReturnType<RoyaltiesService['getEmptySummary']>;
type AuthorBankValidationAttempt =
  AuthorProfileDetail['bankValidationAttempts'][number];

@Injectable()
export class AuthorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly royaltiesService: RoyaltiesService,
  ) {}

  async apply(userId: string, dto: ApplyAuthorDto) {
    const result = await this.ensureCollaboratorProfile(userId, {
      publicName: dto.publicName.trim(),
      legalName: dto.legalName,
      bio: dto.bio,
      authorProfileType: dto.authorProfileType,
      taxId: dto.taxId,
      taxIdLetters: dto.taxIdLetters,
      taxIdDatePart: dto.taxIdDatePart,
      taxIdHomoclave: dto.taxIdHomoclave,
      curp: dto.curp,
      dateOfBirth: dto.dateOfBirth,
      payoutMethod: dto.payoutMethod,
      payoutAccountData: dto.payoutAccountData,
      auditEventType: AuditEventType.AUTHOR_APPLICATION_APPROVED,
      auditSource: 'self-service-profile-update',
    });

    return {
      message: 'Tu perfil colaborador quedo actualizado.',
      authorProfile: this.mapAuthorProfile(result),
    };
  }

  async getMyAuthorProfile(userId: string) {
    const authorProfile = await this.ensureCollaboratorProfile(userId, {
      auditEventType: AuditEventType.ADMIN_ACTION,
      auditSource: 'profile-read-auto-provision',
    });
    const royaltiesSummary = await this.royaltiesService.buildSummary(authorProfile.id, {
      recentSalesLimit: 5,
      payoutHistoryLimit: 5,
    });
    const syncedAuthorProfile = await this.syncAuthorLoyaltyState(
      authorProfile,
      royaltiesSummary.confirmedSalesCount,
    );

    return {
      hasAuthorProfile: true,
      authorProfile: this.mapAuthorProfile(syncedAuthorProfile, royaltiesSummary),
    };
  }

  async requestBankValidation(userId: string) {
    const authorProfile = await this.ensureCollaboratorProfile(userId, {
      auditEventType: AuditEventType.ADMIN_ACTION,
      auditSource: 'bank-validation-request-readiness',
    });

    const payoutAccountData = this.extractPayoutAccountData(
      authorProfile.payoutAccountData,
    );

    if (
      !authorProfile.legalName ||
      !authorProfile.curp ||
      !authorProfile.dateOfBirth
    ) {
      throw new BadRequestException(
        'Completa primero tu nombre o razon social, CURP y fecha de nacimiento antes de solicitar la validacion bancaria.',
      );
    }

    if (
      !authorProfile.payoutMethod ||
      !payoutAccountData.accountHolder ||
      !payoutAccountData.bankName ||
      !this.isValidClabe(payoutAccountData.clabe)
    ) {
      throw new BadRequestException(
        'Completa primero los datos bancarios del socio antes de solicitar la validacion.',
      );
    }

    if (authorProfile.bankValidationStatus === BankValidationStatus.VALIDATED) {
      return {
        message: 'Tu cuenta bancaria ya se encuentra validada.',
        authorProfile: this.mapAuthorProfile(authorProfile),
      };
    }

    const now = new Date();
    const reference =
      authorProfile.bankValidationReference ??
      `BANK-VAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate(),
      ).padStart(2, '0')}-${authorProfile.id.slice(-6).toUpperCase()}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.authorProfile.update({
        where: {
          id: authorProfile.id,
        },
        data: {
          bankValidationStatus: BankValidationStatus.PENDING_VALIDATION,
          bankValidationReference: reference,
          bankValidationRequestedAt: now,
          bankValidationNotes: null,
          bankValidatedAt: null,
        },
        include: authorProfileDetailInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'author_bank_validation',
          entityId: result.id,
          targetUserId: userId,
          metadata: {
            action: 'bank_validation_requested',
            reference,
            requestedAt: now.toISOString(),
          },
        },
      });

      return result;
    });

    return {
      message:
        'Tu solicitud de validacion bancaria fue enviada. Quedara pendiente de revision administrativa.',
      authorProfile: this.mapAuthorProfile(updated),
    };
  }

  async startBankMicrodeposit(
    actorUserId: string,
    authorProfileId: string,
    dto: ReviewBankValidationDto,
  ) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { id: authorProfileId },
      include: authorProfileDetailInclude,
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil de autor no encontrado.');
    }

    const payoutAccountData = this.extractPayoutAccountData(
      authorProfile.payoutAccountData,
    );

    if (
      !authorProfile.payoutMethod ||
      !payoutAccountData.accountHolder ||
      !payoutAccountData.bankName ||
      !this.isValidClabe(payoutAccountData.clabe)
    ) {
      throw new BadRequestException(
        'La cuenta bancaria del socio esta incompleta.',
      );
    }

    const latestAttempt = this.extractLatestBankValidationAttempt(authorProfile);
    if (
      latestAttempt &&
      latestAttempt.status === BankValidationAttemptStatus.MICRODEPOSIT_SENT &&
      latestAttempt.expiresAt &&
      new Date(latestAttempt.expiresAt).getTime() > Date.now()
    ) {
      throw new BadRequestException(
        'Ya existe un microdeposito activo pendiente de confirmacion por parte del socio.',
      );
    }

    const now = new Date();
    const amountMinor = this.generateMicrodepositAmountMinor();
    const referenceCode = this.buildBankReferenceCode();
    const notes = this.normalizeOptionalString(dto.notes);
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bankValidationAttempt.updateMany({
        where: {
          authorProfileId,
          status: BankValidationAttemptStatus.MICRODEPOSIT_SENT,
        },
        data: {
          status: BankValidationAttemptStatus.EXPIRED,
          notes: 'Expirado por nuevo intento de microdeposito.',
        },
      });

      await tx.bankValidationAttempt.create({
        data: {
          authorProfileId,
          initiatedByAdminUserId: actorUserId,
          provider: 'STRIPE',
          amountMinor,
          currency: 'MXN',
          referenceCode,
          status: BankValidationAttemptStatus.MICRODEPOSIT_SENT,
          sentAt: now,
          expiresAt,
          notes,
          metadata: {
            providerMode: 'pending_real_stripe_integration',
          },
        },
      });

      const result = await tx.authorProfile.update({
        where: { id: authorProfileId },
        data: {
          bankValidationStatus: BankValidationStatus.PENDING_VALIDATION,
          bankValidationReference: referenceCode,
          bankValidationRequestedAt:
            authorProfile.bankValidationRequestedAt ?? now,
          bankValidationNotes: notes,
          bankValidatedAt: null,
        },
        include: authorProfileDetailInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'author_bank_validation',
          entityId: result.id,
          targetUserId: result.userId,
          metadata: {
            action: 'bank_microdeposit_started',
            provider: 'STRIPE',
            amountMinor,
            currency: 'MXN',
            referenceCode,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return result;
    });

    return {
      message:
        'Microdeposito iniciado. El socio debe revisar su banca y confirmar el monto o la referencia.',
      authorProfile: this.mapAuthorProfile(updated),
    };
  }

  async confirmBankMicrodeposit(
    userId: string,
    dto: ConfirmBankMicrodepositDto,
  ) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { userId },
      include: authorProfileDetailInclude,
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil de autor no encontrado.');
    }

    const latestAttempt = this.extractLatestBankValidationAttempt(authorProfile);
    if (!latestAttempt || latestAttempt.status !== BankValidationAttemptStatus.MICRODEPOSIT_SENT) {
      throw new BadRequestException(
        'No hay un microdeposito activo pendiente de confirmacion.',
      );
    }

    if (latestAttempt.expiresAt && new Date(latestAttempt.expiresAt).getTime() < Date.now()) {
      await this.prisma.bankValidationAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          status: BankValidationAttemptStatus.EXPIRED,
          notes: 'Expirado por tiempo sin confirmacion.',
        },
      });
      throw new BadRequestException(
        'El microdeposito expiro. Solicita uno nuevo con el administrador.',
      );
    }

    const expectedReference = String(latestAttempt.referenceCode ?? '').trim().toUpperCase();
    const expectedAmountDisplay = this.formatAmountMinor(latestAttempt.amountMinor);
    const receivedReference = this.normalizeOptionalString(dto.referenceCode)?.toUpperCase() ?? null;
    const receivedAmount = this.normalizeMicrodepositAmount(dto.amount);

    if (!receivedReference && receivedAmount === null) {
      throw new BadRequestException(
        'Captura el monto o la referencia del microdeposito para confirmar la cuenta.',
      );
    }

    const referenceMatches = receivedReference === expectedReference;
    const amountMatches =
      receivedAmount !== null && receivedAmount === latestAttempt.amountMinor;
    const didMatch = referenceMatches || amountMatches;
    const nextAttemptsUsed = latestAttempt.verificationAttemptsUsed + 1;
    const notes = didMatch
      ? 'Microdeposito confirmado por el socio.'
      : `Confirmacion fallida. Intento ${nextAttemptsUsed} de ${latestAttempt.maxVerificationAttempts}.`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.bankValidationAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          verificationAttemptsUsed: nextAttemptsUsed,
          status: didMatch
            ? BankValidationAttemptStatus.CONFIRMED
            : nextAttemptsUsed >= latestAttempt.maxVerificationAttempts
              ? BankValidationAttemptStatus.REJECTED
              : BankValidationAttemptStatus.MICRODEPOSIT_SENT,
          confirmedAt: didMatch ? new Date() : null,
          notes,
        },
      });

      const result = await tx.authorProfile.update({
        where: { id: authorProfile.id },
        data: didMatch
          ? {
              bankValidationStatus: BankValidationStatus.VALIDATED,
              bankValidatedAt: new Date(),
              bankValidationNotes: `Validacion confirmada con microdeposito ${expectedAmountDisplay} / ${expectedReference}.`,
            }
          : nextAttemptsUsed >= latestAttempt.maxVerificationAttempts
            ? {
                bankValidationStatus: BankValidationStatus.REJECTED,
                bankValidationNotes:
                  'Se agotaron los intentos de confirmacion del microdeposito.',
              }
            : {
                bankValidationStatus: BankValidationStatus.PENDING_VALIDATION,
                bankValidationNotes: notes,
              },
        include: authorProfileDetailInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'author_bank_validation',
          entityId: result.id,
          targetUserId: userId,
          metadata: {
            action: didMatch
              ? 'bank_microdeposit_confirmed'
              : 'bank_microdeposit_confirmation_failed',
            referenceMatches,
            amountMatches,
            attemptId: attempt.id,
            verificationAttemptsUsed: nextAttemptsUsed,
          },
        },
      });

      return result;
    });

    if (didMatch) {
      return {
        message: 'Microdeposito confirmado. Tu cuenta bancaria quedo validada.',
        authorProfile: this.mapAuthorProfile(updated),
      };
    }

    if (nextAttemptsUsed >= latestAttempt.maxVerificationAttempts) {
      return {
        message:
          'No coincidio el microdeposito y se agotaron los intentos. La validacion bancaria fue rechazada.',
        authorProfile: this.mapAuthorProfile(updated),
      };
    }

    return {
      message:
        'El monto o la referencia no coinciden. Revisa tu banca e intenta nuevamente.',
      authorProfile: this.mapAuthorProfile(updated),
    };
  }

  async listApplications() {
    const applications = await this.prisma.authorProfile.findMany({
      where: {
        applicationStatus: AuthorApplicationStatus.IN_REVIEW,
      },
      include: authorProfileDetailInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: applications.map((application) => this.mapAuthorProfile(application)),
      total: applications.length,
    };
  }

  async approve(
    actorUserId: string,
    authorProfileId: string,
    dto: ReviewAuthorApplicationDto,
  ) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { id: authorProfileId },
      include: authorProfileDetailInclude,
    });

    if (!authorProfile) {
      throw new NotFoundException('Solicitud de autor no encontrada.');
    }

    if (authorProfile.applicationStatus === AuthorApplicationStatus.APPROVED) {
      throw new ConflictException('La solicitud ya fue aprobada.');
    }

    if (authorProfile.applicationStatus !== AuthorApplicationStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes en revision.',
      );
    }

    const authorRole = await this.prisma.role.findUnique({
      where: { name: RoleName.AUTHOR },
    });

    if (!authorRole) {
      throw new InternalServerErrorException(
        'No existe el rol AUTHOR en la base de datos.',
      );
    }

    const now = new Date();
    const approvedRoyaltyRatePercent =
      dto.royaltyRatePercent?.trim() ||
      authorProfile.royaltyRatePercent?.toString?.() ||
      '10.00';

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAuthorProfile = await tx.authorProfile.update({
        where: { id: authorProfile.id },
        data: {
          applicationStatus: AuthorApplicationStatus.APPROVED,
          royaltyRatePercent: approvedRoyaltyRatePercent,
          approvedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        },
        include: authorProfileDetailInclude,
      });

      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: authorProfile.userId,
            roleId: authorRole.id,
          },
        },
        update: {},
        create: {
          userId: authorProfile.userId,
          roleId: authorRole.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.AUTHOR_APPLICATION_APPROVED,
          entityType: 'author_profile',
          entityId: updatedAuthorProfile.id,
          targetUserId: authorProfile.userId,
          metadata: {
            royaltyRatePercent: approvedRoyaltyRatePercent,
            approvedAt: now.toISOString(),
          },
        },
      });

      return updatedAuthorProfile;
    });

    return {
      message: 'Solicitud de autor aprobada.',
      authorProfile: this.mapAuthorProfile(result),
    };
  }

  async reject(
    actorUserId: string,
    authorProfileId: string,
    dto: ReviewAuthorApplicationDto,
  ) {
    const rejectionReason = this.normalizeOptionalString(dto.rejectionReason);

    if (!rejectionReason) {
      throw new BadRequestException(
        'Para rechazar debes enviar rejectionReason.',
      );
    }

    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { id: authorProfileId },
      include: authorProfileDetailInclude,
    });

    if (!authorProfile) {
      throw new NotFoundException('Solicitud de autor no encontrada.');
    }

    if (authorProfile.applicationStatus === AuthorApplicationStatus.REJECTED) {
      throw new ConflictException('La solicitud ya fue rechazada.');
    }

    if (authorProfile.applicationStatus !== AuthorApplicationStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes en revision.',
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAuthorProfile = await tx.authorProfile.update({
        where: { id: authorProfile.id },
        data: {
          applicationStatus: AuthorApplicationStatus.REJECTED,
          rejectedAt: now,
          rejectionReason,
        },
        include: authorProfileDetailInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.AUTHOR_APPLICATION_REJECTED,
          entityType: 'author_profile',
          entityId: updatedAuthorProfile.id,
          targetUserId: authorProfile.userId,
          metadata: {
            rejectedAt: now.toISOString(),
            rejectionReason,
          },
        },
      });

      return updatedAuthorProfile;
    });

    return {
      message: 'Solicitud de autor rechazada.',
      authorProfile: this.mapAuthorProfile(result),
    };
  }

  async approveBankValidation(
    actorUserId: string,
    authorProfileId: string,
    dto: ReviewBankValidationDto,
  ) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { id: authorProfileId },
      include: authorProfileDetailInclude,
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil de autor no encontrado.');
    }

    const payoutAccountData = this.extractPayoutAccountData(
      authorProfile.payoutAccountData,
    );

    if (
      !authorProfile.payoutMethod ||
      !payoutAccountData.accountHolder ||
      !payoutAccountData.bankName ||
      !this.isValidClabe(payoutAccountData.clabe)
    ) {
      throw new BadRequestException(
        'No se puede validar una cuenta bancaria incompleta.',
      );
    }

    const now = new Date();
    const notes = this.normalizeOptionalString(dto.notes);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.authorProfile.update({
        where: { id: authorProfileId },
        data: {
          bankValidationStatus: BankValidationStatus.VALIDATED,
          bankValidatedAt: now,
          bankValidationRequestedAt:
            authorProfile.bankValidationRequestedAt ?? now,
          bankValidationNotes: notes,
          bankValidationReference:
            authorProfile.bankValidationReference ??
            `BANK-VAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
              now.getDate(),
            ).padStart(2, '0')}-${authorProfile.id.slice(-6).toUpperCase()}`,
        },
        include: authorProfileDetailInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'author_bank_validation',
          entityId: updated.id,
          targetUserId: updated.userId,
          metadata: {
            action: 'bank_validation_approved',
            notes,
            validatedAt: now.toISOString(),
          },
        },
      });

      return updated;
    });

    return {
      message: 'La cuenta bancaria del socio quedo validada correctamente.',
      authorProfile: this.mapAuthorProfile(result),
    };
  }

  async rejectBankValidation(
    actorUserId: string,
    authorProfileId: string,
    dto: ReviewBankValidationDto,
  ) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { id: authorProfileId },
      include: authorProfileDetailInclude,
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil de autor no encontrado.');
    }

    const notes = this.normalizeOptionalString(dto.notes);

    if (!notes) {
      throw new BadRequestException(
        'Debes indicar el motivo de rechazo de la validacion bancaria.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.authorProfile.update({
        where: { id: authorProfileId },
        data: {
          bankValidationStatus: BankValidationStatus.REJECTED,
          bankValidationNotes: notes,
          bankValidatedAt: null,
        },
        include: authorProfileDetailInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'author_bank_validation',
          entityId: result.id,
          targetUserId: result.userId,
          metadata: {
            action: 'bank_validation_rejected',
            notes,
          },
        },
      });

      return result;
    });

    return {
      message: 'La validacion bancaria fue rechazada.',
      authorProfile: this.mapAuthorProfile(updated),
    };
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

  private async ensureCollaboratorProfile(
    userId: string,
    options?: {
      publicName?: string;
      legalName?: string;
      bio?: string;
      authorProfileType?: AuthorProfileType;
      taxId?: string;
      taxIdLetters?: string;
      taxIdDatePart?: string;
      taxIdHomoclave?: string;
      curp?: string;
      dateOfBirth?: string;
      payoutMethod?: string;
      payoutAccountData?: Record<string, unknown>;
      auditEventType?: AuditEventType;
      auditSource?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        authorProfile: true,
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

    const authorRole = await this.prisma.role.findUnique({
      where: { name: RoleName.AUTHOR },
    });

    if (!authorRole) {
      throw new InternalServerErrorException(
        'No existe el rol AUTHOR en la base de datos.',
      );
    }

    const approvedAt = user.authorProfile?.approvedAt ?? new Date();
    const publicName =
      options?.publicName?.trim() ||
      user.authorProfile?.publicName ||
      this.buildCollaboratorPublicName(user.email);
    const hasAuthorRole = user.roles.some((entry) => entry.role.name === RoleName.AUTHOR);
    const shouldAudit =
      !hasAuthorRole ||
      !user.authorProfile ||
      user.authorProfile.applicationStatus !== AuthorApplicationStatus.APPROVED ||
      typeof options?.publicName !== 'undefined' ||
      typeof options?.legalName !== 'undefined' ||
      typeof options?.bio !== 'undefined' ||
      typeof options?.authorProfileType !== 'undefined' ||
      typeof options?.taxId !== 'undefined' ||
      typeof options?.taxIdLetters !== 'undefined' ||
      typeof options?.taxIdDatePart !== 'undefined' ||
      typeof options?.taxIdHomoclave !== 'undefined' ||
      typeof options?.curp !== 'undefined' ||
      typeof options?.dateOfBirth !== 'undefined' ||
      typeof options?.payoutMethod !== 'undefined' ||
      typeof options?.payoutAccountData !== 'undefined';

    return this.prisma.$transaction(async (tx) => {
      const normalizedLegalName =
        typeof options?.legalName === 'undefined'
          ? undefined
          : this.normalizeOptionalString(options.legalName);
      const normalizedCurp =
        typeof options?.curp === 'undefined'
          ? undefined
          : this.normalizeCurp(options.curp);
      const parsedDateOfBirth =
        typeof options?.dateOfBirth === 'undefined'
          ? undefined
          : this.normalizeDateOfBirth(options.dateOfBirth);
      const normalizedTaxId = this.resolveDeclaredTaxId(
        {
          taxId: options?.taxId,
          taxIdLetters: options?.taxIdLetters,
          taxIdDatePart: options?.taxIdDatePart,
          taxIdHomoclave: options?.taxIdHomoclave,
        },
        user.authorProfile?.taxIdDeclared ?? null,
      );
      const normalizedPayoutMethod =
        typeof options?.payoutMethod === 'undefined'
          ? undefined
          : this.normalizeOptionalString(options.payoutMethod);
      const normalizedPayoutAccountData =
        typeof options?.payoutAccountData === 'undefined'
          ? undefined
          : this.normalizePayoutAccountData(options.payoutAccountData);
      const payoutAccountDataForStatus =
        typeof normalizedPayoutAccountData !== 'undefined'
          ? normalizedPayoutAccountData
          : this.extractPayoutAccountData(user.authorProfile?.payoutAccountData);
      const nextBankValidationStatus = this.resolveBankValidationStatus(
        user.authorProfile,
        normalizedPayoutAccountData,
      );
      const derivedTaxId = this.buildDerivedTaxId({
        legalName:
          typeof normalizedLegalName === 'undefined'
            ? user.authorProfile?.legalName ?? null
            : normalizedLegalName,
        dateOfBirth:
          typeof parsedDateOfBirth === 'undefined'
            ? user.authorProfile?.dateOfBirth ?? null
            : parsedDateOfBirth,
      });
      const nextTaxIdDeclared =
        typeof normalizedTaxId === 'undefined'
          ? user.authorProfile?.taxIdDeclared ?? null
          : normalizedTaxId;
      const nextTaxIdSource = nextTaxIdDeclared
        ? TaxIdSource.DECLARED
        : derivedTaxId
          ? TaxIdSource.DERIVED
          : TaxIdSource.NONE;
      const nextTaxIdValue = nextTaxIdDeclared ?? derivedTaxId ?? null;

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

      const authorProfile = await tx.authorProfile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          publicName,
          legalName: normalizedLegalName,
          curp: normalizedCurp,
          dateOfBirth: parsedDateOfBirth,
          bio:
            typeof options?.bio === 'undefined'
              ? undefined
              : this.normalizeOptionalString(options.bio),
          authorProfileType:
            options?.authorProfileType ??
            user.authorProfile?.authorProfileType ??
            AuthorProfileType.CERTIFIED,
          taxId: nextTaxIdValue,
          taxIdDeclared: nextTaxIdDeclared,
          taxIdDerived: derivedTaxId,
          taxIdSource: nextTaxIdSource,
          payoutMethod: normalizedPayoutMethod,
          payoutAccountData:
            typeof normalizedPayoutAccountData === 'undefined'
              ? undefined
              : this.normalizeJsonField(normalizedPayoutAccountData),
          bankValidationStatus: nextBankValidationStatus,
          bankValidatedAt:
            nextBankValidationStatus === BankValidationStatus.VALIDATED
              ? user.authorProfile?.bankValidatedAt ?? new Date()
              : null,
          applicationStatus: AuthorApplicationStatus.APPROVED,
          royaltyRatePercent:
            user.authorProfile?.royaltyRatePercent?.toString?.() ?? '10.00',
          approvedAt,
          rejectedAt: null,
          rejectionReason: null,
        },
        create: {
          userId: user.id,
          publicName,
          legalName: normalizedLegalName ?? null,
          curp: normalizedCurp ?? null,
          dateOfBirth: parsedDateOfBirth ?? null,
          bio: this.normalizeOptionalString(options?.bio),
          authorProfileType: options?.authorProfileType ?? AuthorProfileType.CERTIFIED,
          taxId: nextTaxIdValue,
          taxIdDeclared: nextTaxIdDeclared,
          taxIdDerived: derivedTaxId,
          taxIdSource: nextTaxIdSource,
          payoutMethod: normalizedPayoutMethod ?? null,
          payoutAccountData: this.normalizeJsonField(
            typeof normalizedPayoutAccountData === 'undefined'
              ? payoutAccountDataForStatus
              : normalizedPayoutAccountData,
          ),
          bankValidationStatus: nextBankValidationStatus,
          applicationStatus: AuthorApplicationStatus.APPROVED,
          royaltyRatePercent: '10.00',
          approvedAt,
        },
        include: authorProfileDetailInclude,
      });

      if (shouldAudit) {
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            eventType: options?.auditEventType ?? AuditEventType.ADMIN_ACTION,
            entityType: 'author_profile',
            entityId: authorProfile.id,
            targetUserId: user.id,
            metadata: {
              source: options?.auditSource ?? 'collaborator-auto-provision',
              publicName: authorProfile.publicName,
              applicationStatus: authorProfile.applicationStatus,
            },
          },
        });
      }

      return authorProfile;
    });
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

  private mapAuthorProfile(
    authorProfile: AuthorProfileDetail,
    royaltiesSummary?: AuthorRoyaltiesSummary,
  ) {
    const publishingCompliance = this.buildPublishingCompliance(authorProfile);
    const latestBankValidationAttempt =
      this.extractLatestBankValidationAttempt(authorProfile);
    const loyalty = this.buildLoyaltySnapshot(
      authorProfile,
      royaltiesSummary?.confirmedSalesCount ?? 0,
    );

    return {
      id: authorProfile.id,
      userId: authorProfile.userId,
      userEmail: authorProfile.user?.email ?? null,
      publicName: authorProfile.publicName,
      legalName: authorProfile.legalName,
      curp: authorProfile.curp,
      dateOfBirth: authorProfile.dateOfBirth,
      bio: authorProfile.bio,
      authorProfileType: authorProfile.authorProfileType,
      applicationStatus: authorProfile.applicationStatus,
      royaltyRatePercent: authorProfile.royaltyRatePercent?.toString?.() ?? null,
      loyalty,
      taxId: authorProfile.taxId,
      taxIdDeclared: authorProfile.taxIdDeclared,
      taxIdDerived: authorProfile.taxIdDerived,
      taxIdSource: authorProfile.taxIdSource,
      payoutMethod: authorProfile.payoutMethod,
      payoutAccountData: authorProfile.payoutAccountData,
      bankValidationStatus: publishingCompliance.bankValidationStatus,
      bankValidationReference: authorProfile.bankValidationReference,
      bankValidationRequestedAt: authorProfile.bankValidationRequestedAt,
      bankValidationNotes: authorProfile.bankValidationNotes,
      bankValidatedAt: authorProfile.bankValidatedAt,
      latestBankValidationAttempt: latestBankValidationAttempt
        ? {
            id: latestBankValidationAttempt.id,
            provider: latestBankValidationAttempt.provider,
            currency: latestBankValidationAttempt.currency,
            referenceHint: this.maskReferenceCode(
              latestBankValidationAttempt.referenceCode,
            ),
            status: latestBankValidationAttempt.status,
            verificationAttemptsUsed:
              latestBankValidationAttempt.verificationAttemptsUsed,
            maxVerificationAttempts:
              latestBankValidationAttempt.maxVerificationAttempts,
            sentAt: latestBankValidationAttempt.sentAt,
            confirmedAt: latestBankValidationAttempt.confirmedAt,
            expiresAt: latestBankValidationAttempt.expiresAt,
            notes: latestBankValidationAttempt.notes,
            createdAt: latestBankValidationAttempt.createdAt,
            updatedAt: latestBankValidationAttempt.updatedAt,
          }
        : null,
      royaltiesSummary: royaltiesSummary ?? this.royaltiesService.getEmptySummary(),
      publishingCompliance,
      governmentIdFileId: authorProfile.governmentIdFileId,
      avatarFileId: authorProfile.avatarFileId,
      approvedAt: authorProfile.approvedAt,
      rejectedAt: authorProfile.rejectedAt,
      rejectionReason: authorProfile.rejectionReason,
      createdAt: authorProfile.createdAt,
      updatedAt: authorProfile.updatedAt,
    };
  }

  private buildLoyaltySnapshot(
    authorProfile: AuthorProfileDetail,
    confirmedSalesCount: number,
  ) {
    const publishedWorksCount = Array.isArray(authorProfile.works)
      ? authorProfile.works.filter((work) => work.status === 'PUBLISHED').length
      : 0;
    const hasCompletePublicProfile = Boolean(
      authorProfile.bio?.trim() && authorProfile.user?.profile?.avatarUrl,
    );

    const snapshot = buildAuthorLoyaltySnapshot({
      publishedWorksCount,
      confirmedSalesCount,
      hasCompletePublicProfile,
      manualLevel: authorProfile.loyaltyManualLevel ?? null,
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
    };
  }

  private async syncAuthorLoyaltyState(
    authorProfile: AuthorProfileDetail,
    confirmedSalesCount: number,
  ) {
    const snapshot = this.buildLoyaltySnapshot(authorProfile, confirmedSalesCount);
    const nextRate = snapshot.currentRatePercent;
    const currentRate = authorProfile.royaltyRatePercent?.toString?.() ?? '0.00';

    if (currentRate === nextRate) {
      return authorProfile;
    }

    return this.prisma.authorProfile.update({
      where: { id: authorProfile.id },
      data: {
        royaltyRatePercent: nextRate,
      },
      include: authorProfileDetailInclude,
    });
  }

  private extractLatestBankValidationAttempt(authorProfile: AuthorProfileDetail) {
    if (!Array.isArray(authorProfile?.bankValidationAttempts)) {
      return null;
    }

    return (authorProfile.bankValidationAttempts[0] as AuthorBankValidationAttempt) ?? null;
  }

  private buildPublishingCompliance(authorProfile: AuthorProfileDetail) {
    const legalName = this.normalizeOptionalString(authorProfile.legalName) ?? '';
    const curp = this.normalizeCurp(authorProfile.curp);
    const dateOfBirth = this.normalizeDateValue(authorProfile.dateOfBirth);
    const payoutMethod = this.normalizeOptionalString(authorProfile.payoutMethod) ?? '';
    const payoutAccountData = this.extractPayoutAccountData(authorProfile.payoutAccountData);
    const bankValidationStatus = this.normalizeBankValidationStatus(
      authorProfile.bankValidationStatus,
      payoutAccountData,
    );

    const missingFields: string[] = [];

    if (!legalName) {
      missingFields.push('nombre o razon social');
    }

    if (!curp) {
      missingFields.push('CURP');
    }

    if (!dateOfBirth) {
      missingFields.push('fecha de nacimiento');
    }

    if (!payoutMethod) {
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

    const hasFiscalData =
      Boolean(legalName) && Boolean(curp) && Boolean(dateOfBirth);
    const hasBankingData =
      Boolean(payoutMethod) &&
      Boolean(payoutAccountData.accountHolder) &&
      Boolean(payoutAccountData.bankName) &&
      this.isValidClabe(payoutAccountData.clabe);

    return {
      hasFiscalData,
      hasBankingData,
      bankValidationStatus,
      canPublish: hasFiscalData && hasBankingData,
      missingFields,
    };
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

  private normalizeTaxId(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim().toUpperCase();
  }

  private normalizeTaxIdLetters(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z&Ñ]/g, '')
      .slice(0, 4);
  }

  private normalizeTaxIdDatePart(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.replace(/\D/g, '').slice(0, 6);
  }

  private normalizeTaxIdHomoclave(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3);
  }

  private resolveDeclaredTaxId(
    input: {
      taxId?: string;
      taxIdLetters?: string;
      taxIdDatePart?: string;
      taxIdHomoclave?: string;
    },
    existingDeclaredTaxId?: string | null,
  ) {
    const directTaxId = this.normalizeTaxId(input.taxId);
    if (directTaxId) {
      return directTaxId;
    }

    const letters = this.normalizeTaxIdLetters(input.taxIdLetters);
    const datePart = this.normalizeTaxIdDatePart(input.taxIdDatePart);
    const homoclave = this.normalizeTaxIdHomoclave(input.taxIdHomoclave);

    const hasAnySplitPart = Boolean(letters || datePart || homoclave);
    if (!hasAnySplitPart) {
      return undefined;
    }

    if (letters.length !== 4 || datePart.length !== 6) {
      throw new BadRequestException(
        'El RFC debe capturarse con 4 letras y 6 digitos de fecha.',
      );
    }

    const prefix = `${letters}${datePart}`;
    const existing = this.normalizeTaxId(existingDeclaredTaxId);

    if (!homoclave && existing.startsWith(prefix) && existing.length >= 13) {
      return existing.slice(0, 13);
    }

    return `${prefix}${homoclave || this.generateTaxIdHomoclave()}`;
  }

  private generateTaxIdHomoclave() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(3);

    return Array.from(bytes)
      .map((byte) => alphabet[byte % alphabet.length])
      .join('');
  }

  private normalizeCurp(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim().toUpperCase();
  }

  private normalizeDateOfBirth(value?: string) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        'La fecha de nacimiento debe enviarse en un formato valido.',
      );
    }

    return parsed;
  }

  private normalizeDateValue(value: unknown) {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizePayoutAccountData(value?: Record<string, unknown>) {
    const normalized = this.extractPayoutAccountData(value);
    return {
      accountHolder: normalized.accountHolder,
      bankName: normalized.bankName,
      clabe: normalized.clabe,
      accountNumber: normalized.accountNumber,
    } as Record<string, unknown>;
  }

  private resolveBankValidationStatus(
    existingAuthorProfile?: {
      payoutAccountData?: Prisma.JsonValue | null;
      bankValidationStatus?: BankValidationStatus | null;
    } | null,
    nextPayoutAccountData?: Record<string, unknown>,
  ) {
    if (typeof nextPayoutAccountData === 'undefined') {
      return existingAuthorProfile?.bankValidationStatus ?? BankValidationStatus.MISSING;
    }

    const next = this.extractPayoutAccountData(nextPayoutAccountData);
    const hasCompleteBankData =
      Boolean(next.accountHolder) &&
      Boolean(next.bankName) &&
      this.isValidClabe(next.clabe);

    if (!hasCompleteBankData) {
      return BankValidationStatus.MISSING;
    }

    return BankValidationStatus.VALIDATED;
  }

  private normalizeBankValidationStatus(
    value: unknown,
    payoutAccountData: {
      accountHolder: string;
      bankName: string;
      clabe: string;
      accountNumber: string;
    },
  ) {
    if (
      !payoutAccountData.accountHolder ||
      !payoutAccountData.bankName ||
      !this.isValidClabe(payoutAccountData.clabe)
    ) {
      return BankValidationStatus.MISSING;
    }

    if (
      value === BankValidationStatus.VALIDATED ||
      value === BankValidationStatus.PENDING_VALIDATION ||
      value === BankValidationStatus.REJECTED
    ) {
      return value === BankValidationStatus.VALIDATED
        ? value
        : BankValidationStatus.VALIDATED;
    }

    return BankValidationStatus.VALIDATED;
  }

  private buildDerivedTaxId(input: {
    legalName?: string | null;
    dateOfBirth?: Date | null;
  }) {
    const legalName = this.normalizeOptionalString(input.legalName ?? undefined);
    const dateOfBirth = this.normalizeDateValue(input.dateOfBirth);

    if (!legalName || !dateOfBirth) {
      return null;
    }

    const parts = legalName
      .toUpperCase()
      .replace(/[^A-ZÑ\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return null;
    }

    const firstSurname = parts[0] ?? 'X';
    const secondSurname = parts[1] ?? 'X';
    const givenName = parts[2] ?? parts[1] ?? parts[0] ?? 'X';
    const internalVowel =
      firstSurname.slice(1).match(/[AEIOU]/)?.[0] ?? 'X';
    const base = `${firstSurname.charAt(0) || 'X'}${internalVowel}${
      secondSurname.charAt(0) || 'X'
    }${givenName.charAt(0) || 'X'}`;
    const yy = String(dateOfBirth.getUTCFullYear()).slice(-2);
    const mm = String(dateOfBirth.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dateOfBirth.getUTCDate()).padStart(2, '0');
    const suffix = this.buildDeterministicSuffix(`${legalName}-${yy}${mm}${dd}`);

    return `${base}${yy}${mm}${dd}${suffix}`;
  }

  private buildDeterministicSuffix(seed: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let hash = 0;

    for (const char of seed) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    let suffix = '';
    let remaining = hash;

    for (let index = 0; index < 3; index += 1) {
      suffix += alphabet[remaining % alphabet.length];
      remaining = Math.floor(remaining / alphabet.length);
    }

    return suffix;
  }

  private generateMicrodepositAmountMinor() {
    return 10 + Math.floor(Math.random() * 90);
  }

  private buildBankReferenceCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(6);

    return `EH${Array.from(bytes)
      .map((byte) => alphabet[byte % alphabet.length])
      .join('')}`;
  }

  private normalizeMicrodepositAmount(value?: string) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim().replace(/[^0-9.]/g, '');
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return Math.round(parsed * 100);
  }

  private formatAmountMinor(amountMinor?: number | null) {
    if (typeof amountMinor !== 'number' || !Number.isFinite(amountMinor)) {
      return null;
    }

    return (amountMinor / 100).toFixed(2);
  }

  private maskReferenceCode(referenceCode?: string | null) {
    if (!referenceCode) {
      return null;
    }

    const normalized = referenceCode.trim().toUpperCase();
    if (normalized.length <= 4) {
      return normalized;
    }

    return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
  }

  private isValidClabe(value: string) {
    return /^[0-9]{18}$/.test(value);
  }
}
