import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { __express as hbsExpressEngine } from 'hbs';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
    bodyParser: true,
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      enableDebugMessages: process.env.NODE_ENV !== 'production',
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((s: string) => s.trim()),
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  app.set('trust proxy', true);

  const rawBodyLimit = configService.get<string>('BODY_LIMIT') || '10mb';
  app.useBodyParser('json', { limit: rawBodyLimit });
  app.useBodyParser('urlencoded', { limit: rawBodyLimit, extended: true });

  if (process.env.NODE_ENV === 'production') {
    const clientDistDir = join(process.cwd(), 'dist/client');
    const clientBasePath = configService.get<string>('CLIENT_BASE_PATH') || '/';

    app.useStaticAssets(clientDistDir, {
      prefix: clientBasePath === '/' ? '/' : clientBasePath,
      index: false,
    });

    app.setBaseViewsDir(clientDistDir);
    app.setViewEngine('html');
    app.engine('html', hbsExpressEngine);

    logger.log(`Static assets served from ${clientDistDir}`);
    logger.log(`Client base path: ${clientBasePath}`);
  }

  const host = configService.get<string>('SERVER_HOST') || '0.0.0.0';
  const port = Number(configService.get<string>('SERVER_PORT') || '3000');

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}

bootstrap();
