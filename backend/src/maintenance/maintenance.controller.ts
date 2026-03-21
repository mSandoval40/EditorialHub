import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MaintenanceService } from './maintenance.service';

type AuthenticatedRequest = {
  user: {
    sub: string;
  };
};

type CleanupUploadsBody = {
  simulate?: boolean;
};

type DevCleanupBody = {
  confirmationText?: string;
  simulate?: boolean;
  removeUploads?: boolean;
};

type BootstrapAdminsBody = {
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

@Controller('admin/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.ADMIN_02)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('overview')
  getOverview() {
    return this.maintenanceService.getOverview();
  }

  @Post('cleanup/orphaned-uploads')
  cleanupOrphanedUploads(@Body() body: CleanupUploadsBody) {
    return this.maintenanceService.cleanupOrphanedUploads(body.simulate !== false);
  }

  @Post('cleanup/dev-soft-clean')
  softCleanDevelopmentData(@Req() req: AuthenticatedRequest, @Body() body: DevCleanupBody) {
    return this.maintenanceService.softCleanDevelopmentData(req.user.sub, {
      confirmationText: body.confirmationText,
      simulate: body.simulate !== false,
      removeUploads: body.removeUploads !== false,
    });
  }

  @Post('cleanup/dev-factory-reset')
  factoryReset(@Req() req: AuthenticatedRequest, @Body() body: DevCleanupBody) {
    return this.maintenanceService.factoryReset(req.user.sub, {
      confirmationText: body.confirmationText,
      simulate: body.simulate !== false,
      removeUploads: body.removeUploads !== false,
    });
  }

  @Post('admins/bootstrap')
  bootstrapAdmins(@Req() req: AuthenticatedRequest, @Body() body: BootstrapAdminsBody) {
    return this.maintenanceService.bootstrapAdmins(req.user.sub, body);
  }
}
