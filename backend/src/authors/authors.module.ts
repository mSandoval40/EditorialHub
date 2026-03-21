import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoyaltiesModule } from '../royalties/royalties.module';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';

@Module({
  imports: [AuthModule, RoyaltiesModule],
  controllers: [AuthorsController],
  providers: [AuthorsService, RolesGuard],
  exports: [AuthorsService],
})
export class AuthorsModule {}
