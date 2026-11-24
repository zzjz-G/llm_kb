import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { LogModule } from '@server/common/log/log.module';
import { AuthMiddleware } from '@server/common/jwt/auth.middleware';
import { JwtModule } from '@server/common/jwt/jwt.module';
import { HazardousChemicalsModule } from '@server/modules/hazardous-chemicals/hazardous-chemicals.module';
import { EmailModule } from '@server/modules/email/email.module';

@Module({
  imports: [LogModule, JwtModule, HazardousChemicalsModule, EmailModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'api/purchase/check-stock', method: RequestMethod.GET },
      )
      .forRoutes(PurchaseController);
  }
}
