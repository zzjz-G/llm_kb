import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LoggerModule } from '@lark-apaas/nestjs-logger';

import { DatabaseModule } from './common/database/database.module';
import { JwtModule } from './common/jwt/jwt.module';
import { LogModule } from './common/log/log.module';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { RolesGuard } from './common/jwt/roles.guard';
import { ViewModule } from './modules/view/view.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LogsModule } from './modules/logs/logs.module';
import { ExportModule } from './modules/export/export.module';
import { HazardousChemicalsModule } from './modules/hazardous-chemicals/hazardous-chemicals.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    LoggerModule,
    DatabaseModule,
    JwtModule,
    LogModule,
    PurchaseModule,
    AuthModule,
    UsersModule,
    InventoryModule,
    LogsModule,
    ExportModule,
    HazardousChemicalsModule,
    EmailModule,
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
