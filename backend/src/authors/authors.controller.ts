import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApplyAuthorDto } from './dto/apply-author.dto';
import { ConfirmBankMicrodepositDto } from './dto/confirm-bank-microdeposit.dto';
import { ReviewBankValidationDto } from './dto/review-bank-validation.dto';
import { ReviewAuthorApplicationDto } from './dto/review-author-application.dto';
import { AuthorsService } from './authors.service';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
};

@Controller()
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Post('authors/apply')
  @UseGuards(JwtAuthGuard)
  apply(@Req() req: AuthenticatedRequest, @Body() dto: ApplyAuthorDto) {
    return this.authorsService.apply(req.user.sub, dto);
  }

  @Get('authors/me')
  @UseGuards(JwtAuthGuard)
  getMyAuthorProfile(@Req() req: AuthenticatedRequest) {
    return this.authorsService.getMyAuthorProfile(req.user.sub);
  }

  @Post('authors/me/bank-validation/request')
  @UseGuards(JwtAuthGuard)
  requestBankValidation(@Req() req: AuthenticatedRequest) {
    return this.authorsService.requestBankValidation(req.user.sub);
  }

  @Post('authors/me/bank-validation/confirm-microdeposit')
  @UseGuards(JwtAuthGuard)
  confirmBankMicrodeposit(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ConfirmBankMicrodepositDto,
  ) {
    return this.authorsService.confirmBankMicrodeposit(req.user.sub, dto);
  }

  @Get('admin/authors/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  listApplications() {
    return this.authorsService.listApplications();
  }

  @Post('admin/authors/:authorProfileId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  approve(
    @Req() req: AuthenticatedRequest,
    @Param('authorProfileId') authorProfileId: string,
    @Body() dto: ReviewAuthorApplicationDto,
  ) {
    return this.authorsService.approve(req.user.sub, authorProfileId, dto);
  }

  @Post('admin/authors/:authorProfileId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('authorProfileId') authorProfileId: string,
    @Body() dto: ReviewAuthorApplicationDto,
  ) {
    return this.authorsService.reject(req.user.sub, authorProfileId, dto);
  }

  @Post('admin/authors/:authorProfileId/bank-validation/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  approveBankValidation(
    @Req() req: AuthenticatedRequest,
    @Param('authorProfileId') authorProfileId: string,
    @Body() dto: ReviewBankValidationDto,
  ) {
    return this.authorsService.approveBankValidation(
      req.user.sub,
      authorProfileId,
      dto,
    );
  }

  @Post('admin/authors/:authorProfileId/bank-validation/start-microdeposit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  startBankMicrodeposit(
    @Req() req: AuthenticatedRequest,
    @Param('authorProfileId') authorProfileId: string,
    @Body() dto: ReviewBankValidationDto,
  ) {
    return this.authorsService.startBankMicrodeposit(
      req.user.sub,
      authorProfileId,
      dto,
    );
  }

  @Post('admin/authors/:authorProfileId/bank-validation/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.ADMIN_02)
  rejectBankValidation(
    @Req() req: AuthenticatedRequest,
    @Param('authorProfileId') authorProfileId: string,
    @Body() dto: ReviewBankValidationDto,
  ) {
    return this.authorsService.rejectBankValidation(
      req.user.sub,
      authorProfileId,
      dto,
    );
  }
}
