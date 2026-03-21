import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoyaltiesService } from './royalties.service';
import { UpdatePayoutRequestDto } from './dto/update-payout-request.dto';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
};

@Controller()
export class RoyaltiesController {
  constructor(private readonly royaltiesService: RoyaltiesService) {}

  @Get('royalties/me/payout-requests')
  @UseGuards(JwtAuthGuard)
  listMyPayoutRequests(@Req() req: AuthenticatedRequest) {
    return this.royaltiesService.listMyPayoutRequests(req.user.sub);
  }

  @Post('royalties/me/payout-requests')
  @UseGuards(JwtAuthGuard)
  createMyPayoutRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.createMyPayoutRequest(req.user.sub, dto.notes);
  }

  @Post('royalties/me/payout-requests/:payoutRequestId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelMyPayoutRequest(
    @Req() req: AuthenticatedRequest,
    @Param('payoutRequestId') payoutRequestId: string,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.cancelMyPayoutRequest(
      req.user.sub,
      payoutRequestId,
      dto.notes,
    );
  }

  @Get('admin/royalties/payout-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  listAdminPayoutRequests() {
    return this.royaltiesService.listAdminPayoutRequests();
  }

  @Post('admin/royalties/payout-requests/:payoutRequestId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  schedulePayoutRequest(
    @Req() req: AuthenticatedRequest,
    @Param('payoutRequestId') payoutRequestId: string,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.schedulePayoutRequest(
      req.user.sub,
      payoutRequestId,
      dto.notes,
    );
  }

  @Post('admin/royalties/payout-requests/:payoutRequestId/mark-paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  markPayoutRequestPaid(
    @Req() req: AuthenticatedRequest,
    @Param('payoutRequestId') payoutRequestId: string,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.markPayoutRequestPaid(
      req.user.sub,
      payoutRequestId,
      dto.notes,
    );
  }

  @Post('admin/royalties/payout-requests/:payoutRequestId/fail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  failPayoutRequest(
    @Req() req: AuthenticatedRequest,
    @Param('payoutRequestId') payoutRequestId: string,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.failPayoutRequest(
      req.user.sub,
      payoutRequestId,
      dto.notes,
    );
  }

  @Post('admin/royalties/payout-requests/:payoutRequestId/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  retryPayoutRequest(
    @Req() req: AuthenticatedRequest,
    @Param('payoutRequestId') payoutRequestId: string,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.retryPayoutRequest(
      req.user.sub,
      payoutRequestId,
      dto.notes,
    );
  }

  @Post('admin/royalties/payout-requests/:payoutRequestId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  cancelAdminPayoutRequest(
    @Req() req: AuthenticatedRequest,
    @Param('payoutRequestId') payoutRequestId: string,
    @Body() dto: UpdatePayoutRequestDto,
  ) {
    return this.royaltiesService.cancelAdminPayoutRequest(
      req.user.sub,
      payoutRequestId,
      dto.notes,
    );
  }
}
