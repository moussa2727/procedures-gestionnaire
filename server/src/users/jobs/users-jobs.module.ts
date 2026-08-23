import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UsersQueueService } from './users-queue.service';
import { UsersProcessor } from './processors/users.processor';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';
import { USERS_QUEUE } from './users-job.constants';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({ name: USERS_QUEUE }),
  ],
  providers: [UsersQueueService, UsersProcessor],
  exports: [UsersQueueService],
})
export class UsersJobsModule {}
