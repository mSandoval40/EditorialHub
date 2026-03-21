import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSecurityService } from './admin-security.service';
import { MaintenanceMailService } from './mail.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [AuthModule],
  controllers: [MaintenanceController, AdminSecurityController],
  providers: [MaintenanceService, AdminSecurityService, MaintenanceMailService, RolesGuard],
  exports: [MaintenanceService, AdminSecurityService],
})
export class MaintenanceModule {}
