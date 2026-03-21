import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoyaltiesController } from './royalties.controller';
import { RoyaltiesService } from './royalties.service';

@Module({
  imports: [AuthModule],
  controllers: [RoyaltiesController],
  providers: [RoyaltiesService, RolesGuard],
  exports: [RoyaltiesService],
})
export class RoyaltiesModule {}
