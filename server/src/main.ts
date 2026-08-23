// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Logger personnalisé
  const loggerService = await app.resolve(LoggerService);
  app.useLogger(loggerService);

  const configService = app.get(ConfigService);

  // Préfixe global avec exclusion des endpoints publics
  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/docs', '/favicon.ico', '/ping', '/api'],
  });

  // Versioning API
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Cookie parser avec secret
  const cookieSecret = configService.get<string>('COOKIE_SECRET') || 'dev-cookie-secret-change-me';
  app.use(cookieParser(cookieSecret));

  // CORS
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Swagger (uniquement en développement)
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Paname Consulting API')
      .setDescription(
        'API de gestion des contacts, rendez-vous, procedures et authentification',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .addTag('auth', 'Authentification')
      .addTag('users', 'Gestion des utilisateurs')
      .addTag('contacts', 'Gestion des contacts')
      .addTag('rendez-vous', 'Gestion des rendez-vous')
      .addTag('procedure', 'Gestion des procédures')
      .addTag('follow-up-meeting', 'Gestion des rendez-vous de suivi')
      .addTag('destinations', 'Gestion des destinations')
      .addTag('consultant-destinations', 'Gestion des affectations')
      .addTag('notifications', 'Notifications')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('Swagger documentation available at /docs');
  }

  const port = parseInt(configService.get<string>('PORT') || '10000', 10);

  await app.listen(port, '0.0.0.0');

  // Logs de démarrage
  logger.log(`Application running on port ${port}`);
  logger.log(`URL: http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`CORS enabled for: ${frontendUrl}`);
  
  if (nodeEnv !== 'production') {
    logger.log(`Swagger: http://localhost:${port}/docs`);
  }
}

bootstrap();