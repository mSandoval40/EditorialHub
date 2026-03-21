import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  AuditEventType,
  Prisma,
  PayoutRequestStatus,
  PurchaseStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type RoyaltySummaryOptions = {
  includeBuyerEmail?: boolean;
  recentSalesLimit?: number;
  payoutHistoryLimit?: number;
};

type RoyaltyRecentSale = {
  purchaseId: string;
  folio: string;
  workId: string;
  workTitle: string;
  soldAt: string;
  unitPrice: string;
  royaltyRatePercent: string;
  royaltyAmount: string;
  authorNetAmount: string;
  platformAmount: string;
  estimatedProcessorFeeAmount: string;
  platformNetAmount: string;
  buyerEmail: string | null;
};

type RoyaltyEconomicOverview = {
  authorShareAmount: string;
  platformShareAmount: string;
  estimatedProcessorFeeAmount: string;
  platformNetAmount: string;
  authorParticipationPercent: string;
  platformParticipationPercent: string;
  processorFeeConfigured: boolean;
  processorFeePercent: string;
  processorFeeFixedAmount: string;
};

type RoyaltyPayoutHistoryItem = {
  id: string;
  status: PayoutRequestStatus;
  grossAmount: string;
  commissionAmount: string;
  netAmount: string;
  currency: string;
  requestedAt: string;
  scheduledFor: string | null;
  paidAt: string | null;
  notes: string | null;
};

type RoyaltySummary = {
  confirmedSalesCount: number;
  confirmedUnits: number;
  grossSalesAmount: string;
  royaltyGeneratedAmount: string;
  platformShareAmount: string;
  estimatedProcessorFeeAmount: string;
  platformNetAmount: string;
  authorParticipationPercent: string;
  platformParticipationPercent: string;
  reservedRoyaltyAmount: string;
  paidRoyaltyAmount: string;
  paidNetAmount: string;
  availableRoyaltyAmount: string;
  lastSaleAt: string | null;
  lastPayoutAt: string | null;
  economicOverview: RoyaltyEconomicOverview;
  recentSales: RoyaltyRecentSale[];
  payoutHistory: RoyaltyPayoutHistoryItem[];
};

type MutableRoyaltySummary = {
  confirmedSalesCount: number;
  confirmedUnits: number;
  grossSalesAmount: number;
  royaltyGeneratedAmount: number;
  platformShareAmount: number;
  estimatedProcessorFeeAmount: number;
  platformNetAmount: number;
  reservedRoyaltyAmount: number;
  paidRoyaltyAmount: number;
  paidNetAmount: number;
  availableRoyaltyAmount: number;
  lastSaleAt: string | null;
  lastPayoutAt: string | null;
  recentSales: RoyaltyRecentSale[];
  payoutHistory: RoyaltyPayoutHistoryItem[];
};

type PayoutRow = {
  id: string;
  authorProfileId: string;
  status: PayoutRequestStatus;
  grossAmount: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
  currency: string;
  requestedAt: Date;
  scheduledFor: Date | null;
  paidAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  providerReference: string | null;
  notes: string | null;
};

type PayoutTransferResult = {
  success: boolean;
  providerReference: string | null;
  providerMode: string;
  notes: string;
};

type ProcessorFeeConfig = {
  configured: boolean;
  percent: number;
  fixedAmount: number;
};

@Injectable()
export class RoyaltiesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoyaltiesService.name);
  private automationTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.startAutomationLoop();
  }

  onModuleDestroy() {
    if (this.automationTimer) {
      clearInterval(this.automationTimer);
      this.automationTimer = null;
    }
  }

  async listMyPayoutRequests(userId: string) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        publicName: true,
      },
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil colaborador no encontrado.');
    }

    const [summary, payoutRequests] = await Promise.all([
      this.buildSummary(authorProfile.id, {
        recentSalesLimit: 5,
        payoutHistoryLimit: 12,
      }),
      this.prisma.payoutRequest.findMany({
        where: {
          authorProfileId: authorProfile.id,
        },
        orderBy: {
          requestedAt: 'desc',
        },
      }),
    ]);

    return {
      authorProfileId: authorProfile.id,
      publicName: authorProfile.publicName,
      summary,
      items: payoutRequests.map((item) => this.mapPayoutRequest(item)),
      total: payoutRequests.length,
    };
  }

  async createMyPayoutRequest(userId: string, notes?: string) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        publicName: true,
      },
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil colaborador no encontrado.');
    }

    const summary = await this.buildSummary(authorProfile.id, {
      recentSalesLimit: 5,
      payoutHistoryLimit: 12,
    });
    const availableAmount = Number(summary.availableRoyaltyAmount);

    if (!Number.isFinite(availableAmount) || availableAmount <= 0) {
      throw new BadRequestException(
        'Todavia no tienes regalías disponibles para solicitar pago.',
      );
    }

    const existingOpenRequest = await this.prisma.payoutRequest.findFirst({
      where: {
        authorProfileId: authorProfile.id,
        status: {
          in: [PayoutRequestStatus.REQUESTED, PayoutRequestStatus.SCHEDULED],
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    if (existingOpenRequest) {
      throw new BadRequestException(
        'Ya tienes una solicitud de pago abierta. Espera a que se programe o se pague antes de crear otra.',
      );
    }

    const amount = new Prisma.Decimal(availableAmount.toFixed(2));
    const requestedAt = new Date();
    const payoutRequest = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payoutRequest.create({
        data: {
          authorProfileId: authorProfile.id,
          requestedByUserId: userId,
          status: PayoutRequestStatus.REQUESTED,
          grossAmount: amount,
          commissionAmount: new Prisma.Decimal('0.00'),
          netAmount: amount,
          currency: 'MXN',
          requestedAt,
          notes: this.mergeNotes(notes, [
            `Solicitud semanal creada por el socio el ${requestedAt.toISOString()}.`,
          ]),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.PAYOUT_REQUEST_CREATED,
          entityType: 'payout_request',
          entityId: created.id,
          targetUserId: userId,
          payoutRequestId: created.id,
          metadata: {
            authorProfileId: authorProfile.id,
            grossAmount: amount.toString(),
            netAmount: amount.toString(),
            cycleScheduledFor: this.getNextPayoutExecutionDate(requestedAt).toISOString(),
          },
        },
      });

      return created;
    });

    return {
      message:
        'Tu solicitud semanal de pago de regalías fue creada. Se considerará en el corte del viernes correspondiente.',
      payoutRequest: this.mapPayoutRequest(payoutRequest),
      summary: await this.buildSummary(authorProfile.id, {
        recentSalesLimit: 5,
        payoutHistoryLimit: 12,
      }),
    };
  }

  async cancelMyPayoutRequest(
    userId: string,
    payoutRequestId: string,
    notes?: string,
  ) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: {
        authorProfile: {
          select: {
            userId: true,
            id: true,
          },
        },
      },
    });

    if (!payoutRequest || payoutRequest.authorProfile.userId !== userId) {
      throw new NotFoundException('Solicitud de pago no encontrada.');
    }

    if (payoutRequest.status !== PayoutRequestStatus.REQUESTED) {
      throw new BadRequestException(
        'Solo puedes cancelar solicitudes que todavia no han sido programadas por administracion.',
      );
    }

    const updated = await this.cancelPayoutRequestInternal(
      payoutRequestId,
      userId,
      payoutRequest.requestedByUserId,
      payoutRequest.notes,
      notes,
      'payout_request_cancelled_by_socio',
    );

    return {
      message: 'Tu solicitud de pago fue cancelada y el saldo volvió a quedar disponible.',
      payoutRequest: this.mapPayoutRequest(updated),
      summary: await this.buildSummary(payoutRequest.authorProfile.id, {
        recentSalesLimit: 5,
        payoutHistoryLimit: 12,
      }),
    };
  }

  async listAdminPayoutRequests() {
    const payoutRequests = await this.prisma.payoutRequest.findMany({
      include: {
        authorProfile: {
          include: {
            user: true,
          },
        },
      },
      where: {
        status: {
          in: [
            PayoutRequestStatus.REQUESTED,
            PayoutRequestStatus.SCHEDULED,
            PayoutRequestStatus.PAID,
            PayoutRequestStatus.FAILED,
            PayoutRequestStatus.CANCELLED,
          ],
        },
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
    });

    return {
      items: payoutRequests.map((item) => ({
        ...this.mapPayoutRequest(item),
        authorProfileId: item.authorProfileId,
        publicName: item.authorProfile.publicName,
        userEmail: item.authorProfile.user.email,
        cycleScheduledFor: this.getNextPayoutExecutionDate(item.requestedAt).toISOString(),
        isEligibleForCurrentFridayWindow: this.isEligibleForCurrentFridayWindow(
          item.requestedAt,
        ),
        providerReference: item.providerReference ?? null,
      })),
      total: payoutRequests.length,
    };
  }

  async schedulePayoutRequest(
    actorUserId: string,
    payoutRequestId: string,
    notes?: string,
  ) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Solicitud de pago no encontrada.');
    }

    if (payoutRequest.status !== PayoutRequestStatus.REQUESTED) {
      throw new BadRequestException(
        'Solo se pueden programar solicitudes que sigan en estado solicitada.',
      );
    }

    const scheduledFor = this.getNextPayoutExecutionDate(payoutRequest.requestedAt);
    const providerReference =
      payoutRequest.providerReference ?? this.buildPayoutReference('QUEUE');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutRequestStatus.SCHEDULED,
          scheduledFor,
          providerReference,
          notes: this.mergeNotes(payoutRequest.notes, [
            notes ?? '',
            `Programada por admin para ${scheduledFor.toISOString()}.`,
          ]),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.PAYOUT_REQUEST_SCHEDULED,
          entityType: 'payout_request',
          entityId: result.id,
          targetUserId: payoutRequest.requestedByUserId,
          payoutRequestId: result.id,
          metadata: {
            scheduledFor: scheduledFor.toISOString(),
            notes: notes ?? null,
            providerReference,
          },
        },
      });

      return result;
    });

    return {
      message: `Solicitud programada para pago el viernes ${this.formatAdminDateTime(
        scheduledFor,
      )}.`,
      payoutRequest: this.mapPayoutRequest(updated),
    };
  }

  async markPayoutRequestPaid(
    actorUserId: string,
    payoutRequestId: string,
    notes?: string,
  ) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Solicitud de pago no encontrada.');
    }

    if (payoutRequest.status !== PayoutRequestStatus.SCHEDULED) {
      throw new BadRequestException(
        'Solo se pueden marcar como pagadas las solicitudes programadas.',
      );
    }

    const now = new Date();
    if (!this.isFridayAfterNoon(now)) {
      throw new BadRequestException(
        'Las regalías solo pueden marcarse como pagadas el viernes después de las 12:00 horas.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutRequestStatus.PAID,
          paidAt: now,
          providerReference:
            payoutRequest.providerReference ??
            `MANUAL-PAYOUT-${randomBytes(4).toString('hex').toUpperCase()}`,
          notes: this.mergeNotes(payoutRequest.notes, [
            notes ?? '',
            `Pago confirmado el ${now.toISOString()}.`,
          ]),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.PAYOUT_REQUEST_PAID,
          entityType: 'payout_request',
          entityId: result.id,
          targetUserId: payoutRequest.requestedByUserId,
          payoutRequestId: result.id,
          metadata: {
            paidAt: now.toISOString(),
            notes: notes ?? null,
          },
        },
      });

      return result;
    });

    return {
      message: 'La solicitud de regalías quedó marcada como pagada.',
      payoutRequest: this.mapPayoutRequest(updated),
    };
  }

  async failPayoutRequest(
    actorUserId: string,
    payoutRequestId: string,
    notes?: string,
  ) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Solicitud de pago no encontrada.');
    }

    if (payoutRequest.status !== PayoutRequestStatus.SCHEDULED) {
      throw new BadRequestException(
        'Solo se pueden marcar como fallidas las solicitudes programadas.',
      );
    }

    const updated = await this.markPayoutAsFailedInternal(
      payoutRequestId,
      actorUserId,
      payoutRequest.requestedByUserId,
      payoutRequest.notes,
      notes,
      'payout_request_failed_by_admin',
    );

    return {
      message: 'La solicitud quedó marcada como fallida y podrá reintentarse.',
      payoutRequest: this.mapPayoutRequest(updated),
    };
  }

  async retryPayoutRequest(
    actorUserId: string,
    payoutRequestId: string,
    notes?: string,
  ) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Solicitud de pago no encontrada.');
    }

    if (payoutRequest.status !== PayoutRequestStatus.FAILED) {
      throw new BadRequestException(
        'Solo se pueden reintentar solicitudes que estén en estado fallido.',
      );
    }

    const scheduledFor = this.getNextPayoutExecutionDate(new Date());
    const providerReference = this.buildPayoutReference('RETRY');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutRequestStatus.SCHEDULED,
          scheduledFor,
          failedAt: null,
          providerReference,
          notes: this.mergeNotes(payoutRequest.notes, [
            notes ?? '',
            `Reintentada por admin para ${scheduledFor.toISOString()}.`,
          ]),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'payout_request',
          entityId: result.id,
          targetUserId: payoutRequest.requestedByUserId,
          payoutRequestId: result.id,
          metadata: {
            action: 'payout_request_retried',
            scheduledFor: scheduledFor.toISOString(),
            notes: notes ?? null,
            providerReference,
          },
        },
      });

      return result;
    });

    return {
      message: `La solicitud fue reprogramada para el viernes ${this.formatAdminDateTime(
        scheduledFor,
      )}.`,
      payoutRequest: this.mapPayoutRequest(updated),
    };
  }

  async cancelAdminPayoutRequest(
    actorUserId: string,
    payoutRequestId: string,
    notes?: string,
  ) {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
    });

    if (!payoutRequest) {
      throw new NotFoundException('Solicitud de pago no encontrada.');
    }

    if (
      payoutRequest.status !== PayoutRequestStatus.REQUESTED &&
      payoutRequest.status !== PayoutRequestStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Solo se pueden cancelar solicitudes abiertas o programadas.',
      );
    }

    const updated = await this.cancelPayoutRequestInternal(
      payoutRequestId,
      actorUserId,
      payoutRequest.requestedByUserId,
      payoutRequest.notes,
      notes,
      'payout_request_cancelled_by_admin',
    );

    return {
      message:
        'La solicitud de pago fue cancelada. El monto vuelve a quedar disponible para una solicitud futura.',
      payoutRequest: this.mapPayoutRequest(updated),
    };
  }

  async buildBatchSummaries(
    authorProfileIds: string[],
    options?: RoyaltySummaryOptions,
  ): Promise<Map<string, RoyaltySummary>> {
    const uniqueIds = Array.from(
      new Set(authorProfileIds.filter((value) => typeof value === 'string' && value.length > 0)),
    );

    const summaryMap = new Map<string, MutableRoyaltySummary>();
    uniqueIds.forEach((authorProfileId) => {
      summaryMap.set(authorProfileId, this.getEmptyMutableSummary());
    });

    if (uniqueIds.length === 0) {
      return new Map<string, RoyaltySummary>();
    }

    const [purchaseItems, payoutRequests] = await Promise.all([
      this.prisma.purchaseItem.findMany({
        where: {
          work: {
            authorProfileId: {
              in: uniqueIds,
            },
          },
          purchase: {
            status: PurchaseStatus.CONFIRMED,
          },
        },
        select: {
          work: {
            select: {
              authorProfileId: true,
            },
          },
          workId: true,
          titleSnapshot: true,
          unitPrice: true,
          royaltyRatePercent: true,
          purchase: {
            select: {
              id: true,
              folio: true,
              confirmedAt: true,
              createdAt: true,
              buyer: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          purchase: {
            confirmedAt: 'desc',
          },
        },
      }),
      this.prisma.payoutRequest.findMany({
        where: {
          authorProfileId: {
            in: uniqueIds,
          },
          status: {
            not: PayoutRequestStatus.CANCELLED,
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
      }),
    ]);

    purchaseItems.forEach((item) => {
      const authorProfileId = item.work.authorProfileId;
      const summary = summaryMap.get(authorProfileId);

      if (!summary) {
        return;
      }

      const unitPrice = Number(item.unitPrice.toString());
      const royaltyRatePercent = Number(item.royaltyRatePercent.toString());
      const royaltyAmount = (unitPrice * royaltyRatePercent) / 100;
      const platformAmount = Math.max(0, unitPrice - royaltyAmount);
      const processorFeeAmount = this.calculateEstimatedProcessorFee(unitPrice);
      const platformNetAmount = Math.max(0, platformAmount - processorFeeAmount);
      const soldAt = item.purchase.confirmedAt ?? item.purchase.createdAt;

      summary.confirmedSalesCount += 1;
      summary.confirmedUnits += 1;
      summary.grossSalesAmount += unitPrice;
      summary.royaltyGeneratedAmount += royaltyAmount;
      summary.platformShareAmount += platformAmount;
      summary.estimatedProcessorFeeAmount += processorFeeAmount;
      summary.platformNetAmount += platformNetAmount;

      if (!summary.lastSaleAt || soldAt.getTime() > new Date(summary.lastSaleAt).getTime()) {
        summary.lastSaleAt = soldAt.toISOString();
      }

      summary.recentSales.push({
        purchaseId: item.purchase.id,
        folio: item.purchase.folio,
        workId: item.workId,
        workTitle: item.titleSnapshot,
        soldAt: soldAt.toISOString(),
        unitPrice: unitPrice.toFixed(2),
        royaltyRatePercent: royaltyRatePercent.toFixed(2),
        royaltyAmount: royaltyAmount.toFixed(2),
        authorNetAmount: royaltyAmount.toFixed(2),
        platformAmount: platformAmount.toFixed(2),
        estimatedProcessorFeeAmount: processorFeeAmount.toFixed(2),
        platformNetAmount: platformNetAmount.toFixed(2),
        buyerEmail: options?.includeBuyerEmail ? item.purchase.buyer.email : null,
      });
    });

    payoutRequests.forEach((payoutRequest) => {
      const summary = summaryMap.get(payoutRequest.authorProfileId);

      if (!summary) {
        return;
      }

      const grossAmount = Number(payoutRequest.grossAmount.toString());
      const commissionAmount = Number(payoutRequest.commissionAmount.toString());
      const netAmount = Number(payoutRequest.netAmount.toString());

      if (
        payoutRequest.status === PayoutRequestStatus.REQUESTED ||
        payoutRequest.status === PayoutRequestStatus.SCHEDULED
      ) {
        summary.reservedRoyaltyAmount += grossAmount;
      }

      if (payoutRequest.status === PayoutRequestStatus.PAID) {
        summary.paidRoyaltyAmount += grossAmount;
        summary.paidNetAmount += netAmount;

        if (
          payoutRequest.paidAt &&
          (!summary.lastPayoutAt ||
            payoutRequest.paidAt.getTime() > new Date(summary.lastPayoutAt).getTime())
        ) {
          summary.lastPayoutAt = payoutRequest.paidAt.toISOString();
        }
      }

      summary.payoutHistory.push({
        id: payoutRequest.id,
        status: payoutRequest.status,
        grossAmount: grossAmount.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        currency: payoutRequest.currency,
        requestedAt: payoutRequest.requestedAt.toISOString(),
        scheduledFor: payoutRequest.scheduledFor?.toISOString() ?? null,
        paidAt: payoutRequest.paidAt?.toISOString() ?? null,
        notes: payoutRequest.notes,
      });
    });

    const formattedSummaryMap = new Map<string, RoyaltySummary>();

    for (const [authorProfileId, summary] of summaryMap.entries()) {
      const availableRoyaltyAmount = Math.max(
        0,
        summary.royaltyGeneratedAmount -
          summary.reservedRoyaltyAmount -
          summary.paidRoyaltyAmount,
      );
      const authorParticipationPercent =
        summary.grossSalesAmount > 0
          ? (summary.royaltyGeneratedAmount / summary.grossSalesAmount) * 100
          : 0;
      const platformParticipationPercent =
        summary.grossSalesAmount > 0
          ? (summary.platformShareAmount / summary.grossSalesAmount) * 100
          : 0;
      const processorFeeConfig = this.getProcessorFeeConfig();

      formattedSummaryMap.set(authorProfileId, {
        confirmedSalesCount: summary.confirmedSalesCount,
        confirmedUnits: summary.confirmedUnits,
        grossSalesAmount: summary.grossSalesAmount.toFixed(2),
        royaltyGeneratedAmount: summary.royaltyGeneratedAmount.toFixed(2),
        platformShareAmount: summary.platformShareAmount.toFixed(2),
        estimatedProcessorFeeAmount: summary.estimatedProcessorFeeAmount.toFixed(2),
        platformNetAmount: summary.platformNetAmount.toFixed(2),
        authorParticipationPercent: authorParticipationPercent.toFixed(2),
        platformParticipationPercent: platformParticipationPercent.toFixed(2),
        reservedRoyaltyAmount: summary.reservedRoyaltyAmount.toFixed(2),
        paidRoyaltyAmount: summary.paidRoyaltyAmount.toFixed(2),
        paidNetAmount: summary.paidNetAmount.toFixed(2),
        availableRoyaltyAmount: availableRoyaltyAmount.toFixed(2),
        lastSaleAt: summary.lastSaleAt,
        lastPayoutAt: summary.lastPayoutAt,
        economicOverview: {
          authorShareAmount: summary.royaltyGeneratedAmount.toFixed(2),
          platformShareAmount: summary.platformShareAmount.toFixed(2),
          estimatedProcessorFeeAmount: summary.estimatedProcessorFeeAmount.toFixed(2),
          platformNetAmount: summary.platformNetAmount.toFixed(2),
          authorParticipationPercent: authorParticipationPercent.toFixed(2),
          platformParticipationPercent: platformParticipationPercent.toFixed(2),
          processorFeeConfigured: processorFeeConfig.configured,
          processorFeePercent: processorFeeConfig.percent.toFixed(2),
          processorFeeFixedAmount: processorFeeConfig.fixedAmount.toFixed(2),
        },
        recentSales: summary.recentSales.slice(0, options?.recentSalesLimit ?? 5),
        payoutHistory: summary.payoutHistory.slice(0, options?.payoutHistoryLimit ?? 5),
      });
    }

    return formattedSummaryMap;
  }

  async buildSummary(authorProfileId: string, options?: RoyaltySummaryOptions) {
    const summaries = await this.buildBatchSummaries([authorProfileId], options);
    return summaries.get(authorProfileId) ?? this.getEmptySummary();
  }

  private getEmptyMutableSummary(): MutableRoyaltySummary {
    return {
      confirmedSalesCount: 0,
      confirmedUnits: 0,
      grossSalesAmount: 0,
      royaltyGeneratedAmount: 0,
      platformShareAmount: 0,
      estimatedProcessorFeeAmount: 0,
      platformNetAmount: 0,
      reservedRoyaltyAmount: 0,
      paidRoyaltyAmount: 0,
      paidNetAmount: 0,
      availableRoyaltyAmount: 0,
      lastSaleAt: null,
      lastPayoutAt: null,
      recentSales: [],
      payoutHistory: [],
    };
  }

  getEmptySummary(): RoyaltySummary {
    const processorFeeConfig = this.getProcessorFeeConfig();
    return {
      confirmedSalesCount: 0,
      confirmedUnits: 0,
      grossSalesAmount: '0.00',
      royaltyGeneratedAmount: '0.00',
      platformShareAmount: '0.00',
      estimatedProcessorFeeAmount: '0.00',
      platformNetAmount: '0.00',
      authorParticipationPercent: '0.00',
      platformParticipationPercent: '0.00',
      reservedRoyaltyAmount: '0.00',
      paidRoyaltyAmount: '0.00',
      paidNetAmount: '0.00',
      availableRoyaltyAmount: '0.00',
      lastSaleAt: null,
      lastPayoutAt: null,
      economicOverview: {
        authorShareAmount: '0.00',
        platformShareAmount: '0.00',
        estimatedProcessorFeeAmount: '0.00',
        platformNetAmount: '0.00',
        authorParticipationPercent: '0.00',
        platformParticipationPercent: '0.00',
        processorFeeConfigured: processorFeeConfig.configured,
        processorFeePercent: processorFeeConfig.percent.toFixed(2),
        processorFeeFixedAmount: processorFeeConfig.fixedAmount.toFixed(2),
      },
      recentSales: [],
      payoutHistory: [],
    };
  }

  private mapPayoutRequest(item: PayoutRow) {
    return {
      id: item.id,
      status: item.status,
      grossAmount: item.grossAmount.toString(),
      commissionAmount: item.commissionAmount.toString(),
      netAmount: item.netAmount.toString(),
      currency: item.currency,
      requestedAt: item.requestedAt,
      scheduledFor: item.scheduledFor,
      paidAt: item.paidAt,
      failedAt: item.failedAt ?? null,
      cancelledAt: item.cancelledAt ?? null,
      providerReference: item.providerReference ?? null,
      notes: item.notes ?? null,
    };
  }

  private startAutomationLoop() {
    this.automationTimer = setInterval(() => {
      this.runAutomationTick().catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.error(`Fallo la automatizacion de regalias: ${detail}`);
      });
    }, 60 * 1000);

    this.runAutomationTick().catch((error) => {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo la automatizacion inicial de regalias: ${detail}`);
    });
  }

  private async runAutomationTick() {
    const now = new Date();
    await this.autoScheduleFridayRequests(now);
    await this.autoProcessScheduledPayouts(now);
  }

  private async autoScheduleFridayRequests(now: Date) {
    if (now.getDay() !== 5) {
      return;
    }

    const pendingRequests = await this.prisma.payoutRequest.findMany({
      where: {
        status: PayoutRequestStatus.REQUESTED,
      },
    });

    for (const request of pendingRequests) {
      const scheduledFor = this.getNextPayoutExecutionDate(request.requestedAt);
      if (!this.isSameCalendarDay(scheduledFor, now)) {
        continue;
      }
      const autoReference = request.providerReference ?? this.buildPayoutReference('AUTO');

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.payoutRequest.findUnique({
          where: { id: request.id },
        });

        if (!current || current.status !== PayoutRequestStatus.REQUESTED) {
          return;
        }

        await tx.payoutRequest.update({
          where: { id: request.id },
          data: {
            status: PayoutRequestStatus.SCHEDULED,
            scheduledFor,
            providerReference: autoReference,
            notes: this.mergeNotes(current.notes, [
              `Programada automaticamente para ${scheduledFor.toISOString()}.`,
            ]),
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: null,
            eventType: AuditEventType.PAYOUT_REQUEST_SCHEDULED,
            entityType: 'payout_request',
            entityId: request.id,
            targetUserId: current.requestedByUserId,
            payoutRequestId: request.id,
            metadata: {
              action: 'payout_request_auto_scheduled',
              scheduledFor: scheduledFor.toISOString(),
              providerReference: autoReference,
            },
          },
        });
      });
    }
  }

  private async autoProcessScheduledPayouts(now: Date) {
    if (!this.isFridayAfterNoon(now)) {
      return;
    }

    const scheduledRequests = await this.prisma.payoutRequest.findMany({
      where: {
        status: PayoutRequestStatus.SCHEDULED,
      },
    });

    for (const request of scheduledRequests) {
      if (!request.scheduledFor || !this.isSameCalendarDay(request.scheduledFor, now)) {
        continue;
      }

      const result = await this.executePayoutTransfer(request);

      if (result.success) {
        await this.prisma.$transaction(async (tx) => {
          const current = await tx.payoutRequest.findUnique({
            where: { id: request.id },
          });

          if (!current || current.status !== PayoutRequestStatus.SCHEDULED) {
            return;
          }

          await tx.payoutRequest.update({
            where: { id: request.id },
            data: {
              status: PayoutRequestStatus.PAID,
              paidAt: now,
              providerReference: result.providerReference,
              notes: this.mergeNotes(current.notes, [
                `Pago automatico confirmado el ${now.toISOString()}.`,
              ]),
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: null,
              eventType: AuditEventType.PAYOUT_REQUEST_PAID,
              entityType: 'payout_request',
              entityId: request.id,
              targetUserId: current.requestedByUserId,
              payoutRequestId: request.id,
              metadata: {
                action: 'payout_request_auto_paid',
                paidAt: now.toISOString(),
                providerReference: result.providerReference,
                providerMode: result.providerMode,
              },
            },
          });
        });
      } else {
        await this.markPayoutAsFailedInternal(
          request.id,
          null,
          request.requestedByUserId,
          request.notes,
          result.notes,
          'payout_request_auto_failed',
        );
      }
    }
  }

  private getNextPayoutExecutionDate(fromDate: Date) {
    const requested = new Date(fromDate);
    const scheduled = new Date(requested);
    const day = requested.getDay();

    let daysUntilFriday = (5 - day + 7) % 7;
    if (day === 5 || day === 6) {
      daysUntilFriday = daysUntilFriday === 0 ? 7 : daysUntilFriday;
    }

    scheduled.setDate(requested.getDate() + daysUntilFriday);
    scheduled.setHours(12, 0, 0, 0);
    return scheduled;
  }

  private isEligibleForCurrentFridayWindow(requestedAt: Date) {
    const requested = new Date(requestedAt);
    const day = requested.getDay();
    return day >= 0 && day <= 4;
  }

  private isFridayAfterNoon(value: Date) {
    return value.getDay() === 5 && value.getHours() >= 12;
  }

  private formatAdminDateTime(value: Date) {
    return value.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private mergeNotes(base: string | null | undefined, additions: string[]) {
    const parts = [base ?? '', ...additions]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return parts.length > 0 ? parts.join(' | ') : null;
  }

  private buildPayoutReference(prefix: string) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PAYOUT-${prefix}-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private getProcessorFeeConfig(): ProcessorFeeConfig {
    const percent = Number.parseFloat(
      process.env.ROYALTIES_PROCESSOR_FEE_PERCENT?.trim() ?? '0',
    );
    const fixedAmount = Number.parseFloat(
      process.env.ROYALTIES_PROCESSOR_FEE_FIXED_MXN?.trim() ?? '0',
    );

    const safePercent = Number.isFinite(percent) && percent > 0 ? percent : 0;
    const safeFixedAmount =
      Number.isFinite(fixedAmount) && fixedAmount > 0 ? fixedAmount : 0;

    return {
      configured: safePercent > 0 || safeFixedAmount > 0,
      percent: safePercent,
      fixedAmount: safeFixedAmount,
    };
  }

  private calculateEstimatedProcessorFee(amount: number) {
    const config = this.getProcessorFeeConfig();
    if (amount <= 0) {
      return 0;
    }

    const variableFee = (amount * config.percent) / 100;
    return Math.max(0, variableFee + config.fixedAmount);
  }

  private isSameCalendarDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private async executePayoutTransfer(
    payoutRequest: Pick<PayoutRow, 'id' | 'requestedAt'>,
  ): Promise<PayoutTransferResult> {
    const mode =
      process.env.ROYALTIES_PAYOUT_PROVIDER_MODE?.trim().toUpperCase() || 'SIMULATED';

    if (mode === 'SIMULATED') {
      return {
        success: true,
        providerReference: `SIM-PAYOUT-${payoutRequest.id.slice(-6).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
        providerMode: mode,
        notes: 'Pago ejecutado en modo simulado.',
      };
    }

    return {
      success: false,
      providerReference: null,
      providerMode: mode,
      notes:
        'No existe integracion real configurada para dispersion bancaria. Cambia ROYALTIES_PAYOUT_PROVIDER_MODE o conecta un proveedor.',
    };
  }

  private async markPayoutAsFailedInternal(
    payoutRequestId: string,
    actorUserId: string | null,
    targetUserId: string,
    existingNotes: string | null,
    notes: string | undefined,
    action: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutRequestStatus.FAILED,
          failedAt: new Date(),
          providerReference: null,
          notes: this.mergeNotes(existingNotes, [
            notes ?? '',
            `Pago marcado como fallido el ${new Date().toISOString()}.`,
          ]),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'payout_request',
          entityId: result.id,
          targetUserId,
          payoutRequestId: result.id,
          metadata: {
            action,
            notes: notes ?? null,
          },
        },
      });

      return result;
    });
  }

  private async cancelPayoutRequestInternal(
    payoutRequestId: string,
    actorUserId: string,
    targetUserId: string,
    existingNotes: string | null,
    notes: string | undefined,
    action: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: PayoutRequestStatus.CANCELLED,
          cancelledAt: new Date(),
          providerReference: null,
          notes: this.mergeNotes(existingNotes, [
            notes ?? '',
            `Cancelada el ${new Date().toISOString()}.`,
          ]),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: 'payout_request',
          entityId: result.id,
          targetUserId,
          payoutRequestId: result.id,
          metadata: {
            action,
            notes: notes ?? null,
          },
        },
      });

      return result;
    });
  }
}
