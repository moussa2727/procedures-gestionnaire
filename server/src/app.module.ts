// app.module.ts
import { Module, ValidationPipe, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';
import { TokensModule } from './tokens/tokens.module';
import { LockingModule } from './locking/locking.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { DestinationsModule } from './destinations/destinations.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { ProcedureModule } from './procedure/procedure.module';
import { FollowUpMeetingModule } from './follow-up-meeting/follow-up-meeting.module';
import { SeedModule } from './seed/seed.module';
import { RendezVousModule } from './rendezvous/rendez-vous.module';
import { APP_PIPE } from '@nestjs/core';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { XssSanitizationMiddleware } from './common/middleware/xss-sanitization.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(10000),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
        COOKIE_SECRET: Joi.string().default('dev-cookie-secret-change-me'),

        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),

        // Google OAuth: required only in production
        GOOGLE_CLIENT_ID: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().optional().allow('', null),
        }),
        GOOGLE_CLIENT_SECRET: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().optional().allow('', null),
        }),
        GOOGLE_CALLBACK_URL: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().uri().required(),
          otherwise: Joi.string().optional().allow('', null),
        }),

        REDIS_URL: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        EMAIL_FROM: Joi.string().required(),
        RESEND_API_KEY: Joi.string().required(),

        THROTTLE_TTL: Joi.number().default(60000),
        THROTTLE_LIMIT: Joi.number().default(10),

        ARGON2_MEMORY_COST: Joi.number().default(19456),
        ARGON2_TIME_COST: Joi.number().default(2),
        ARGON2_PARALLELISM: Joi.number().default(1),
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get('REDIS_URL'),
        },
      }),
    }),

    PrismaModule,
    RedisModule,
    LoggerModule,
    TokensModule,
    LockingModule,
    EmailModule,
    NotificationsModule,
    UsersModule,
    AuthModule,
    AvailabilityModule,
    DestinationsModule,
    ContactsModule,
    RendezVousModule,
    ProcedureModule,
    FollowUpMeetingModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Security Headers sur toutes les routes
    consumer
      .apply(SecurityHeadersMiddleware, XssSanitizationMiddleware)
      .forRoutes('*');

    // CSRF Protection - exclut les endpoints publics
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: 'csrf-token', method: RequestMethod.GET },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'auth/google', method: RequestMethod.GET },
        { path: 'auth/google/callback', method: RequestMethod.GET },
        { path: 'contacts', method: RequestMethod.POST },
        // récupération de toutes les destinations
        { path: 'destinations/all', method: RequestMethod.GET },
        
      )
      .forRoutes('*');
  }
}