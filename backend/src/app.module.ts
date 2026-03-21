import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuthorsModule } from './authors/authors.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { PrismaModule } from './prisma/prisma.module';
import { PurchasesModule } from './purchases/purchases.module';
import { RoyaltiesModule } from './royalties/royalties.module';
import { UsersModule } from './users/users.module';
import { WorksModule } from './works/works.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    RoyaltiesModule,
    UsersModule,
    AuthorsModule,
    MaintenanceModule,
    WorksModule,
    PurchasesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
