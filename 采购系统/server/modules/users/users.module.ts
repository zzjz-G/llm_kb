import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LogModule } from '@server/common/log/log.module';
import { AuthMiddleware } from '@server/common/jwt/auth.middleware';
import { EmailModule } from '@server/modules/email/email.module';

@Module({
  imports: [LogModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'api/users/register', method: RequestMethod.POST },
      )
      .forRoutes(UsersController);
  }
}
