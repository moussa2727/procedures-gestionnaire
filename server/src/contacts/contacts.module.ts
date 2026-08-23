// modules/contacts/contacts.module.ts – inchangé
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { SpamDetectionService } from './spam-detection.service';
import { RedisModule } from '@/redis/redis.module';
import { RedisService } from '@/redis/redis.service';
import { ContactsGateway } from './contacts.gateway';
import { ContactJobsModule } from './jobs/contact-jobs.module';

@Module({
  imports: [
    ConfigModule,
    ContactJobsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '900s'),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ name: 'public', ttl: 60_000, limit: 3 }],
        storage: new ThrottlerStorageRedisService(redisService.getClient()),
      }),
    }),
  ],
  controllers: [ContactsController],
  providers: [ContactsService, SpamDetectionService, ContactsGateway],
  exports: [ContactsService, SpamDetectionService, ContactsGateway],
})
export class ContactsModule {}
