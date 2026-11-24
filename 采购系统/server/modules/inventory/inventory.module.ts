import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { LogModule } from '@server/common/log/log.module';
import { AuthMiddleware } from '@server/common/jwt/auth.middleware';
import { HazardousChemicalsModule } from '@server/modules/hazardous-chemicals/hazardous-chemicals.module';

@Module({
  imports: [LogModule, HazardousChemicalsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(InventoryController);
  }
}
