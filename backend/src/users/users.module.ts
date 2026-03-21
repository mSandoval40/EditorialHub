import { Module } from '@nestjs/common';
import { RoyaltiesModule } from '../royalties/royalties.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RoyaltiesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
