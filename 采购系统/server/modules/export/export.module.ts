import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { AuthMiddleware } from '@server/common/jwt/auth.middleware';

@Module({
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(ExportController);
  }
}
