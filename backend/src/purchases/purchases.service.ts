import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType,
  DownloadKeyStatus,
  PaymentAttemptStatus,
  PaymentProvider,
  Prisma,
  PurchaseStatus,
  RoleName,
  WorkStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { buildAuthorLoyaltySnapshot } from '../authors/author-loyalty.util';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { hasSocioPurchaseCapability } from '../users/socio-profile.util';

type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: {
    buyer: true;
    items: {
      include: {
        work: {
          include: {
            authorProfile: true;
          };
        };
        workEdition: true;
      };
    };
    downloadKeys: true;
  };
}>;

@Injectable()
export class PurchasesService {
  private static readonly MIN_CHECKOUT_AMOUNT_MXN = new Prisma.Decimal('10.00');
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Falta configurar STRIPE_SECRET_KEY en backend/.env.');
    }

    this.stripe = new Stripe(secretKey);
  }

  async checkout(
    userId: string,
    workId: string,
    dto: CreateCheckoutDto,
    context: { ipAddress: string | null; userAgent: string | null },
  ) {
    await this.reconcilePendingStripePurchases(userId);

    if (!dto.acceptTerms) {
      throw new BadRequestException(
        'Debes aceptar terminos y politica de privacidad antes de iniciar el pago.',
      );
    }

    const { buyer, work, activeEdition } = await this.getCheckoutContext(userId, workId);

    const existingPurchase = await this.prisma.purchase.findFirst({
      where: {
        buyerId: userId,
        status: PurchaseStatus.CONFIRMED,
        items: {
          some: {
            workId: work.id,
          },
        },
      },
      include: {
        buyer: true,
        items: {
          include: {
            work: {
              include: {
                authorProfile: true,
              },
            },
            workEdition: true,
          },
        },
        downloadKeys: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingPurchase) {
      return {
        message: 'Esta obra ya esta en tu biblioteca.',
        alreadyOwned: true,
        checkoutUrl: null,
        purchase: await this.mapPurchase(existingPurchase),
      };
    }

    const price = this.extractPrice(work.metadata);

    if (price.lessThan(PurchasesService.MIN_CHECKOUT_AMOUNT_MXN)) {
      throw new BadRequestException(
        `El precio minimo para checkout con Stripe en MXN es ${PurchasesService.MIN_CHECKOUT_AMOUNT_MXN.toString()}. Actualiza el precio de la obra antes de intentar comprarla.`,
      );
    }

    const royaltyRatePercent = await this.syncAuthorRoyaltyRateForCheckout(
      work.authorProfileId,
    );
    const folio = await this.buildUniqueFolio();
    const frontendBaseUrl = this.getFrontendBaseUrl();

    const checkoutPayload = await this.prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          buyerId: userId,
          folio,
          status: PurchaseStatus.PENDING,
          subtotalAmount: price,
          totalAmount: price,
          currency: 'MXN',
          items: {
            create: {
              workId: work.id,
              workEditionId: activeEdition.id,
              titleSnapshot: activeEdition.titleSnapshot,
              authorNameSnapshot: work.authorProfile.publicName,
              unitPrice: price,
              royaltyRatePercent,
            },
          },
          paymentAttempts: {
            create: {
              buyerId: userId,
              provider: PaymentProvider.STRIPE,
              status: PaymentAttemptStatus.CREATED,
              amount: price,
              currency: 'MXN',
              rawRequest: {
                mode: 'stripe-checkout',
                workId: work.id,
                workTitle: work.title,
                acceptTerms: dto.acceptTerms,
                termsVersion: dto.termsVersion,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
              },
            },
          },
        },
        include: {
          buyer: true,
          items: {
            include: {
              work: {
                include: {
                  authorProfile: true,
                },
              },
              workEdition: true,
            },
          },
          paymentAttempts: true,
          downloadKeys: true,
        },
      });

      const paymentAttempt = createdPurchase.paymentAttempts[0];

      await tx.auditLog.createMany({
        data: [
          {
            actorUserId: userId,
            eventType: AuditEventType.PURCHASE_CREATED,
            entityType: 'purchase',
            entityId: createdPurchase.id,
            targetUserId: userId,
            purchaseId: createdPurchase.id,
            workId: work.id,
            metadata: {
              folio,
              workId: work.id,
              title: work.title,
              totalAmount: price.toString(),
              acceptedTerms: dto.acceptTerms,
              termsVersion: dto.termsVersion,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
            },
          },
          {
            actorUserId: userId,
            eventType: AuditEventType.PAYMENT_ATTEMPT_CREATED,
            entityType: 'purchase',
            entityId: createdPurchase.id,
            targetUserId: userId,
            purchaseId: createdPurchase.id,
            workId: work.id,
            metadata: {
              folio,
              paymentAttemptId: paymentAttempt.id,
              provider: PaymentProvider.STRIPE,
              mode: 'checkout-hosted',
              termsVersion: dto.termsVersion,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
            },
          },
        ],
      });

      return {
        purchaseId: createdPurchase.id,
        paymentAttemptId: paymentAttempt.id,
      };
    });

    const checkoutSession = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${frontendBaseUrl}/compra/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/compra/cancelada?purchaseId=${checkoutPayload.purchaseId}`,
      currency: 'mxn',
      customer_email: buyer.email,
      metadata: {
        purchaseId: checkoutPayload.purchaseId,
        paymentAttemptId: checkoutPayload.paymentAttemptId,
        buyerId: userId,
        workId: work.id,
        termsVersion: dto.termsVersion,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'mxn',
            unit_amount: this.decimalToMinorUnits(price),
            product_data: {
              name: work.title,
              description: `Obra de ${work.authorProfile.publicName} en EditorialHub`,
            },
          },
        },
      ],
    });

    await this.prisma.paymentAttempt.update({
      where: {
        id: checkoutPayload.paymentAttemptId,
      },
      data: {
        providerReference: checkoutSession.id,
        status: PaymentAttemptStatus.PENDING,
        rawResponse: {
          checkoutSessionId: checkoutSession.id,
          checkoutUrl: checkoutSession.url,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      },
    });

    return {
      message: 'Sesion de pago creada. Seras redirigido a Stripe Checkout.',
      alreadyOwned: false,
      checkoutUrl: checkoutSession.url ?? null,
      purchaseId: checkoutPayload.purchaseId,
    };
  }

  async listMyPurchases(userId: string) {
    await this.reconcilePendingStripePurchases(userId);

    const purchases = await this.prisma.purchase.findMany({
      where: {
        buyerId: userId,
        status: PurchaseStatus.CONFIRMED,
      },
      include: {
        buyer: true,
        items: {
          include: {
            work: {
              include: {
                authorProfile: true,
              },
            },
            workEdition: true,
          },
        },
        downloadKeys: true,
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });

    return {
      items: await Promise.all(purchases.map((purchase) => this.mapPurchase(purchase))),
      total: purchases.length,
    };
  }

  async verifyCheckoutSession(userId: string, sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const purchaseId = session.metadata?.purchaseId;
    const buyerId = session.metadata?.buyerId;

    if (!purchaseId || !buyerId) {
      throw new BadRequestException('La sesion de Stripe no contiene referencias de compra validas.');
    }

    if (buyerId !== userId) {
      throw new ForbiddenException('La sesion de pago no pertenece al usuario autenticado.');
    }

    if (session.payment_status === 'paid') {
      await this.confirmStripeCheckout(session);
    } else if (session.status === 'expired') {
      await this.expireStripeCheckout(session);
    }

    const purchase = await this.findPurchaseById(purchaseId);

    if (!purchase || purchase.buyerId !== userId) {
      throw new NotFoundException('No se encontro la compra asociada a la sesion proporcionada.');
    }

    return {
      sessionId: session.id,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      purchaseStatus: purchase.status,
      purchase:
        purchase.status === PurchaseStatus.CONFIRMED ? await this.mapPurchase(purchase) : null,
    };
  }

  async handleStripeWebhook(rawBody: Buffer | undefined, signature?: string) {
    if (!rawBody) {
      throw new BadRequestException('No se recibio el cuerpo crudo del webhook.');
    }

    if (!signature) {
      throw new BadRequestException('Falta la firma del webhook de Stripe.');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Falta configurar STRIPE_WEBHOOK_SECRET en backend/.env.');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('No fue posible verificar la firma del webhook.');
    }

    if (event.type === 'checkout.session.completed') {
      await this.confirmStripeCheckout(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === 'checkout.session.expired') {
      await this.expireStripeCheckout(event.data.object as Stripe.Checkout.Session);
    }

    return { received: true };
  }

  async preparePurchaseDownload(
    userId: string,
    purchaseItemId: string,
    context: { ipAddress: string | null; userAgent: string | null },
  ) {
    const preparedDownload = await this.prisma.$transaction(async (tx) => {
      const purchaseItem = await tx.purchaseItem.findUnique({
        where: {
          id: purchaseItemId,
        },
        include: {
          purchase: {
            include: {
              downloadKeys: {
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
          work: true,
          workEdition: true,
        },
      });

      if (!purchaseItem) {
        throw new NotFoundException('No se encontro el item de biblioteca solicitado.');
      }

      if (purchaseItem.purchase.buyerId !== userId) {
        throw new ForbiddenException('No tienes acceso a esta descarga.');
      }

      if (purchaseItem.purchase.status !== PurchaseStatus.CONFIRMED) {
        throw new BadRequestException('La compra aun no esta confirmada para descarga.');
      }

      if (!purchaseItem.workEdition?.manuscriptFileId) {
        throw new NotFoundException('La edicion comprada no tiene manuscrito disponible.');
      }

      const downloadKey = purchaseItem.purchase.downloadKeys.find((item) => item.status !== DownloadKeyStatus.REVOKED);

      if (!downloadKey) {
        throw new BadRequestException('La compra no cuenta con una clave de descarga activa.');
      }

      const now = new Date();

      if (downloadKey.expiresAt.getTime() <= now.getTime()) {
        await tx.downloadKey.update({
          where: {
            id: downloadKey.id,
          },
          data: {
            status: DownloadKeyStatus.EXPIRED,
          },
        });

        throw new BadRequestException('La clave de descarga ya expiro.');
      }

      if (
        downloadKey.status === DownloadKeyStatus.EXPIRED ||
        downloadKey.status === DownloadKeyStatus.EXHAUSTED
      ) {
        throw new BadRequestException('La clave de descarga ya no permite mas accesos.');
      }

      if (downloadKey.attemptsUsed >= downloadKey.maxAttempts) {
        await tx.downloadKey.update({
          where: {
            id: downloadKey.id,
          },
          data: {
            status: DownloadKeyStatus.EXHAUSTED,
          },
        });

        throw new BadRequestException('La clave de descarga ya alcanzo su limite de intentos.');
      }

      const manuscriptAsset = await tx.fileAsset.findUnique({
        where: {
          id: purchaseItem.workEdition.manuscriptFileId,
        },
      });

      if (!manuscriptAsset) {
        throw new NotFoundException('No se encontro el archivo manuscrito asociado a la compra.');
      }

      const nextAttemptsUsed = downloadKey.attemptsUsed + 1;
      const nextStatus =
        nextAttemptsUsed >= downloadKey.maxAttempts
          ? DownloadKeyStatus.EXHAUSTED
          : DownloadKeyStatus.ACTIVE;

      await tx.downloadKey.update({
        where: {
          id: downloadKey.id,
        },
        data: {
          attemptsUsed: {
            increment: 1,
          },
          consumedAt: downloadKey.consumedAt ?? now,
          status: nextStatus,
        },
      });

      await tx.downloadAttempt.create({
        data: {
          downloadKeyId: downloadKey.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          wasSuccessful: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          eventType: AuditEventType.DOWNLOAD_ATTEMPT,
          entityType: 'purchase',
          entityId: purchaseItem.purchaseId,
          targetUserId: userId,
          purchaseId: purchaseItem.purchaseId,
          workId: purchaseItem.workId,
          metadata: {
            purchaseItemId: purchaseItem.id,
            downloadKeyId: downloadKey.id,
            code: downloadKey.code,
            attemptsUsed: nextAttemptsUsed,
            maxAttempts: downloadKey.maxAttempts,
            status: nextStatus,
            manuscriptFileId: manuscriptAsset.id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        },
      });

      return {
        objectKey: manuscriptAsset.objectKey,
        originalName: this.buildPurchaseDownloadFileName(
          purchaseItem.titleSnapshot,
          purchaseItem.id,
          manuscriptAsset.originalName,
        ),
        mimeType: manuscriptAsset.mimeType,
      };
    });

    const filePath = join(process.cwd(), 'uploads', ...preparedDownload.objectKey.split('/'));

    if (!existsSync(filePath)) {
      throw new NotFoundException('El archivo comprado no esta disponible en almacenamiento local.');
    }

    return {
      ...preparedDownload,
      filePath,
    };
  }

  private async confirmStripeCheckout(session: Stripe.Checkout.Session) {
    const purchaseId = session.metadata?.purchaseId;
    const paymentAttemptId = session.metadata?.paymentAttemptId;

    if (!purchaseId || !paymentAttemptId) {
      return;
    }

    const existingPurchase = await this.prisma.purchase.findUnique({
      where: {
        id: purchaseId,
      },
      include: {
        items: true,
        downloadKeys: true,
      },
    });

    if (!existingPurchase || existingPurchase.status === PurchaseStatus.CONFIRMED) {
      return;
    }

    const paymentAttempt = await this.prisma.paymentAttempt.findUnique({
      where: {
        id: paymentAttemptId,
      },
    });

    if (!paymentAttempt) {
      return;
    }

    const now = new Date();
    const downloadCode = await this.buildUniqueDownloadCode();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: {
          id: purchaseId,
        },
        data: {
          status: PurchaseStatus.CONFIRMED,
          confirmedAt: now,
        },
      });

      await tx.paymentAttempt.update({
        where: {
          id: paymentAttemptId,
        },
        data: {
          status: PaymentAttemptStatus.SUCCEEDED,
          confirmedAt: now,
          providerReference: session.id,
          rawResponse: {
            checkoutSessionId: session.id,
            paymentIntentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
          },
        },
      });

      if (existingPurchase.downloadKeys.length === 0) {
        await tx.downloadKey.create({
          data: {
            purchaseId,
            buyerId: existingPurchase.buyerId,
            code: downloadCode,
            expiresAt,
          },
        });
      }

      await tx.auditLog.createMany({
        data: [
          {
            actorUserId: existingPurchase.buyerId,
            eventType: AuditEventType.PAYMENT_CONFIRMED,
            entityType: 'purchase',
            entityId: purchaseId,
            targetUserId: existingPurchase.buyerId,
            purchaseId,
            workId: existingPurchase.items[0]?.workId,
            metadata: {
              paymentAttemptId,
              provider: PaymentProvider.STRIPE,
              checkoutSessionId: session.id,
              paymentStatus: session.payment_status,
              stripeCustomerEmail: session.customer_details?.email ?? session.customer_email ?? null,
            },
          },
          {
            actorUserId: existingPurchase.buyerId,
            eventType: AuditEventType.DOWNLOAD_KEY_GENERATED,
            entityType: 'purchase',
            entityId: purchaseId,
            targetUserId: existingPurchase.buyerId,
            purchaseId,
            workId: existingPurchase.items[0]?.workId,
            metadata: {
              code: downloadCode,
              expiresAt: expiresAt.toISOString(),
              generatedFrom: 'stripe-webhook',
            },
          },
        ],
      });
    });
  }

  private findPurchaseById(purchaseId: string) {
    return this.prisma.purchase.findUnique({
      where: {
        id: purchaseId,
      },
      include: {
        buyer: true,
        items: {
          include: {
            work: {
              include: {
                authorProfile: true,
              },
            },
            workEdition: true,
          },
        },
        downloadKeys: true,
      },
    });
  }

  private async reconcilePendingStripePurchases(userId: string) {
    const pendingPurchases = await this.prisma.purchase.findMany({
      where: {
        buyerId: userId,
        status: PurchaseStatus.PENDING,
      },
      include: {
        paymentAttempts: {
          where: {
            provider: PaymentProvider.STRIPE,
            status: {
              in: [PaymentAttemptStatus.CREATED, PaymentAttemptStatus.PENDING],
            },
            providerReference: {
              not: null,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const sessionsToCheck = pendingPurchases
      .map((purchase) => purchase.paymentAttempts[0]?.providerReference)
      .filter((sessionId): sessionId is string => Boolean(sessionId));

    if (sessionsToCheck.length === 0) {
      return;
    }

    const sessionResults = await Promise.allSettled(
      sessionsToCheck.map((sessionId) => this.stripe.checkout.sessions.retrieve(sessionId)),
    );

    for (const result of sessionResults) {
      if (result.status !== 'fulfilled') {
        continue;
      }

      const session = result.value;

      if (session.payment_status === 'paid') {
        await this.confirmStripeCheckout(session);
        continue;
      }

      if (session.status === 'expired') {
        await this.expireStripeCheckout(session);
      }
    }
  }

  private async expireStripeCheckout(session: Stripe.Checkout.Session) {
    const purchaseId = session.metadata?.purchaseId;
    const paymentAttemptId = session.metadata?.paymentAttemptId;

    if (!purchaseId || !paymentAttemptId) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.updateMany({
        where: {
          id: purchaseId,
          status: PurchaseStatus.PENDING,
        },
        data: {
          status: PurchaseStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.paymentAttempt.updateMany({
        where: {
          id: paymentAttemptId,
          status: {
            in: [PaymentAttemptStatus.CREATED, PaymentAttemptStatus.PENDING],
          },
        },
        data: {
          status: PaymentAttemptStatus.CANCELLED,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.metadata?.buyerId ?? null,
          eventType: AuditEventType.PAYMENT_FAILED,
          entityType: 'purchase',
          entityId: purchaseId,
          targetUserId: session.metadata?.buyerId ?? null,
          purchaseId,
          workId: session.metadata?.workId ?? null,
          metadata: {
            paymentAttemptId,
            provider: PaymentProvider.STRIPE,
            checkoutSessionId: session.id,
            reason: 'checkout-session-expired',
          },
        },
      });
    });
  }

  private async mapPurchase(purchase: PurchaseWithRelations) {
    const fileIds = new Set<string>();

    purchase.items.forEach((item) => {
      if (item.work.coverFileId) {
        fileIds.add(item.work.coverFileId);
      }

      if (item.workEdition?.manuscriptFileId) {
        fileIds.add(item.workEdition.manuscriptFileId);
      }

      if (item.workEdition?.coverFileId) {
        fileIds.add(item.workEdition.coverFileId);
      }
    });

    const fileAssets = fileIds.size
      ? await this.prisma.fileAsset.findMany({
          where: {
            id: {
              in: Array.from(fileIds),
            },
          },
        })
      : [];

    const fileMap = new Map(fileAssets.map((asset) => [asset.id, asset]));
    const latestDownloadKey = [...purchase.downloadKeys]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;

    return {
      id: purchase.id,
      folio: purchase.folio,
      status: purchase.status,
      currency: purchase.currency,
      subtotalAmount: purchase.subtotalAmount.toString(),
      totalAmount: purchase.totalAmount.toString(),
      confirmedAt: purchase.confirmedAt,
      createdAt: purchase.createdAt,
      downloadKey: latestDownloadKey
        ? {
            code: latestDownloadKey.code,
            status: latestDownloadKey.status,
            expiresAt: latestDownloadKey.expiresAt,
            attemptsUsed: latestDownloadKey.attemptsUsed,
            maxAttempts: latestDownloadKey.maxAttempts,
          }
        : null,
      items: purchase.items.map((item) => {
        const editionCoverAsset =
          item.workEdition?.coverFileId ? fileMap.get(item.workEdition.coverFileId) : null;
        const workCoverAsset = item.work.coverFileId ? fileMap.get(item.work.coverFileId) : null;
        const manuscriptAsset =
          item.workEdition?.manuscriptFileId ? fileMap.get(item.workEdition.manuscriptFileId) : null;

        const coverAsset = editionCoverAsset ?? workCoverAsset ?? null;

        return {
          id: item.id,
          title: item.titleSnapshot,
          authorName: item.authorNameSnapshot,
          unitPrice: item.unitPrice.toString(),
          royaltyRatePercent: item.royaltyRatePercent.toString(),
          workId: item.workId,
          workSlug: item.work.slug,
          publicationType: item.work.publicationType,
          editionNumber: item.workEdition?.editionNumber ?? item.work.currentEdition,
          coverUrl: coverAsset ? this.buildFileUrl(coverAsset.objectKey) : null,
          manuscriptUrl: manuscriptAsset ? this.buildProtectedDownloadUrl(item.id) : null,
          manuscriptMimeType: manuscriptAsset?.mimeType ?? null,
          purchasedAt: purchase.confirmedAt ?? purchase.createdAt,
        };
      }),
    };
  }

  private async getCheckoutContext(userId: string, workId: string) {
    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException('Usuario comprador no encontrado.');
    }

    const roleNames = buyer.roles.map((entry) => entry.role.name);
    const hasBuyerRole = hasSocioPurchaseCapability(roleNames);
    if (!hasBuyerRole) {
      const buyerRole = await this.prisma.role.findUnique({
        where: { name: RoleName.BUYER },
      });

      if (!buyerRole) {
        throw new BadRequestException('No existe el rol BUYER en la base de datos.');
      }

      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: buyer.id,
            roleId: buyerRole.id,
          },
        },
        update: {},
        create: {
          userId: buyer.id,
          roleId: buyerRole.id,
        },
      });
    }

    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      include: {
        authorProfile: true,
        editions: {
          where: {
            isActive: true,
          },
          orderBy: {
            editionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!work || work.status !== WorkStatus.PUBLISHED) {
      throw new NotFoundException('La obra publicada no esta disponible para compra.');
    }

    if (work.createdByUserId === userId) {
      throw new BadRequestException('No puedes comprar tu propia obra.');
    }

    const activeEdition = work.editions[0];
    if (!activeEdition) {
      throw new BadRequestException(
        'La obra publicada no tiene una edicion activa disponible para biblioteca.',
      );
    }

    return {
      buyer,
      work,
      activeEdition,
    };
  }

  private async syncAuthorRoyaltyRateForCheckout(authorProfileId: string) {
    const authorProfile = await this.prisma.authorProfile.findUnique({
      where: { id: authorProfileId },
      include: {
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
      },
    });

    if (!authorProfile) {
      throw new NotFoundException('Perfil de autor no encontrado para checkout.');
    }

    const confirmedSalesCount = await this.prisma.purchaseItem.count({
      where: {
        work: {
          authorProfileId,
        },
        purchase: {
          status: PurchaseStatus.CONFIRMED,
        },
      },
    });

    const publishedWorksCount = Array.isArray(authorProfile.works)
      ? authorProfile.works.filter((work) => work.status === WorkStatus.PUBLISHED).length
      : 0;
    const snapshot = buildAuthorLoyaltySnapshot({
      publishedWorksCount,
      confirmedSalesCount,
      hasCompletePublicProfile: Boolean(
        authorProfile.bio?.trim() && authorProfile.user?.profile?.avatarUrl,
      ),
      manualLevel: authorProfile.loyaltyManualLevel ?? null,
    });
    const nextRate = snapshot.currentRatePercent;
    const currentRate = authorProfile.royaltyRatePercent?.toString?.() ?? '0.00';

    if (currentRate !== nextRate) {
      await this.prisma.authorProfile.update({
        where: { id: authorProfileId },
        data: {
          royaltyRatePercent: nextRate,
        },
      });
    }

    return new Prisma.Decimal(nextRate);
  }

  private extractPrice(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return new Prisma.Decimal('0.00');
    }

    const value = (metadata as Record<string, unknown>).price;

    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return new Prisma.Decimal(value.toFixed(2));
    }

    if (typeof value === 'string') {
      const normalized = value.trim().replace(/[^0-9.]/g, '');
      if (normalized.length > 0 && !Number.isNaN(Number(normalized))) {
        return new Prisma.Decimal(Number(normalized).toFixed(2));
      }
    }

    return new Prisma.Decimal('0.00');
  }

  private async buildUniqueFolio() {
    let folio = '';

    do {
      const stamp = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      folio = `EDH-${stamp}-${suffix}`;
    } while (
      await this.prisma.purchase.findUnique({
        where: {
          folio,
        },
        select: {
          id: true,
        },
      })
    );

    return folio;
  }

  private async buildUniqueDownloadCode() {
    let code = '';

    do {
      code = randomBytes(5).toString('hex').toUpperCase();
    } while (
      await this.prisma.downloadKey.findUnique({
        where: {
          code,
        },
        select: {
          id: true,
        },
      })
    );

    return code;
  }

  private buildFileUrl(objectKey: string) {
    const baseUrl =
      process.env.BACKEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

    return `${baseUrl}/uploads/${objectKey}`;
  }

  private buildProtectedDownloadUrl(purchaseItemId: string) {
    const baseUrl =
      process.env.BACKEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

    return `${baseUrl}/api/purchases/me/items/${purchaseItemId}/download`;
  }

  private buildPurchaseDownloadFileName(
    title: string,
    purchaseItemId: string,
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
    return `${safeTitle}_editorialhub-${purchaseItemId}${extension}`;
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

  private getFrontendBaseUrl() {
    return process.env.FRONTEND_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  }

  private decimalToMinorUnits(value: Prisma.Decimal) {
    return Math.round(Number(value.toString()) * 100);
  }
}
