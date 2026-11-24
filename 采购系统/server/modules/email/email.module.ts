import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailConfigService } from './email-config.service';
import { EmailConfigController } from './email-config.controller';
import { LogModule } from '@server/common/log/log.module';
import { AuthMiddleware } from '@server/common/jwt/auth.middleware';
import { JwtModule } from '@server/common/jwt/jwt.module';

@Module({
  imports: [LogModule, JwtModule],
  controllers: [EmailConfigController],
  providers: [EmailService, EmailConfigService],
  exports: [EmailService],
})
export class EmailModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(EmailConfigController);
  }
}
