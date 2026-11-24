import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

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
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    PurchaseModule,
    AuthModule,
    UsersModule,
    InventoryModule,
    LogsModule,
    ExportModule,
    HazardousChemicalsModule,
    EmailModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
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
