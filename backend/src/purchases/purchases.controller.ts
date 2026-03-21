import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PurchasesService } from './purchases.service';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

@Controller()
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('purchases/checkout/:workId')
  @UseGuards(JwtAuthGuard)
  checkout(
    @Req() req: AuthenticatedRequest,
    @Param('workId') workId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.purchasesService.checkout(req.user.sub, workId, dto, {
      ipAddress: this.extractIp(req),
      userAgent: this.extractHeader(req.headers['user-agent']),
    });
  }

  @Post('payments/stripe/webhook')
  @HttpCode(200)
  handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.purchasesService.handleStripeWebhook(req.rawBody, signature);
  }

  @Get('purchases/me')
  @UseGuards(JwtAuthGuard)
  listMyPurchases(@Req() req: AuthenticatedRequest) {
    return this.purchasesService.listMyPurchases(req.user.sub);
  }

  @Get('purchases/checkout/session/:sessionId/verify')
  @UseGuards(JwtAuthGuard)
  verifyCheckoutSession(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return this.purchasesService.verifyCheckoutSession(req.user.sub, sessionId);
  }

  @Get('purchases/me/items/:purchaseItemId/download')
  @UseGuards(JwtAuthGuard)
  async downloadPurchasedItem(
    @Req() req: AuthenticatedRequest,
    @Param('purchaseItemId') purchaseItemId: string,
    @Res() res: Response,
  ) {
    const download = await this.purchasesService.preparePurchaseDownload(
      req.user.sub,
      purchaseItemId,
      {
        ipAddress: this.extractIp(req),
        userAgent: this.extractHeader(req.headers['user-agent']),
      },
    );

    res.setHeader('Content-Type', download.mimeType || 'application/octet-stream');
    res.setHeader('X-Download-Filename', download.originalName);
    res.download(download.filePath, download.originalName);
  }

  private extractIp(req: AuthenticatedRequest) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const normalizedForwardedFor = this.extractHeader(forwardedFor);

    if (normalizedForwardedFor) {
      return normalizedForwardedFor.split(',')[0]?.trim() || null;
    }

    return req.ip ?? null;
  }

  private extractHeader(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value ?? null;
  }
}
