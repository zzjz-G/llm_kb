import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HazardousChemicalsService } from './hazardous-chemicals.service';
import { HazardousChemicalsController } from './hazardous-chemicals.controller';
import { LogModule } from '@server/common/log/log.module';
import { AuthMiddleware } from '@server/common/jwt/auth.middleware';

@Module({
  imports: [LogModule],
  controllers: [HazardousChemicalsController],
  providers: [HazardousChemicalsService],
  exports: [HazardousChemicalsService],
})
export class HazardousChemicalsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(HazardousChemicalsController);
  }
}
