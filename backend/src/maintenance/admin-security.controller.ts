import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminSecurityService } from './admin-security.service';
import { RequestPrimaryAdminChangeDto } from './dto/request-primary-admin-change.dto';
import { ResolvePrimaryAdminChangeDto } from './dto/resolve-primary-admin-change.dto';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
};

@Controller('admin/security')
export class AdminSecurityController {
  constructor(private readonly adminSecurityService: AdminSecurityService) {}

  @Get('primary-admin-change')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  getPrimaryAdminChangeStatus(@Req() req: AuthenticatedRequest) {
    return this.adminSecurityService.getPrimaryAdminChangeStatus(req.user.sub);
  }

  @Post('primary-admin-change/request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  requestPrimaryAdminChange(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RequestPrimaryAdminChangeDto,
  ) {
    return this.adminSecurityService.requestPrimaryAdminChange(req.user.sub, dto);
  }

  @Get('primary-admin-change/approve')
  getPrimaryAdminChangeApproval(@Query() query: ResolvePrimaryAdminChangeDto) {
    return this.adminSecurityService.getPrimaryAdminChangeApproval(query.token);
  }

  @Post('primary-admin-change/approve')
  approvePrimaryAdminChange(@Body() dto: ResolvePrimaryAdminChangeDto) {
    return this.adminSecurityService.approvePrimaryAdminChange(dto.token);
  }
}
