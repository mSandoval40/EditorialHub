import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WorksController } from './works.controller';
import { WorksService } from './works.service';

@Module({
  imports: [AuthModule],
  controllers: [WorksController],
  providers: [WorksService, RolesGuard],
  exports: [WorksService],
})
export class WorksModule {}
