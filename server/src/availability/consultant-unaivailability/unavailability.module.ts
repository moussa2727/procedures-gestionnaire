// consultant-unavailability/consultant-unavailability.module.ts
import { Module } from '@nestjs/common';
import { ConsultantUnavailabilityService } from './consultant-unavailability.service';
import { ConsultantUnavailabilityController } from './consultant-unavailability.controller';
import { ConsultantUnavailabilityGateway } from './consultant-unavailability.gateway';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';
import { AuthModule } from '@/auth/auth.module';
import { ConsultantUnavailabilityRepository } from '../repositories/consultant-unavailability.repository';

@Module({
  imports: [],
  controllers: [ConsultantUnavailabilityController],
  providers: [
    ConsultantUnavailabilityRepository,
    ConsultantUnavailabilityService,
    ConsultantUnavailabilityGateway,
  ],
  exports: [ConsultantUnavailabilityService],
})
export class ConsultantUnavailabilityModule {}
