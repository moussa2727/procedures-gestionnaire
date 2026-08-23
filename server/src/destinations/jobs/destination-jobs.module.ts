import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DestinationCacheProcessor } from './processors/destination-cache.processor';
import { DestinationCleanupProcessor } from './processors/destination-cleanup.processor';
import { DestinationStatsProcessor } from './processors/destination-stats.processor';
import { DestinationQueueService } from './services/destination-queue.service';
import { DESTINATION_QUEUES } from './constants/destination-jobs.constants';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CloudinaryModule,
    BullModule.registerQueue(
      { name: DESTINATION_QUEUES.CACHE },
      { name: DESTINATION_QUEUES.CLEANUP },
      { name: DESTINATION_QUEUES.STATS },
    ),
  ],
  providers: [
    DestinationCacheProcessor,
    DestinationCleanupProcessor,
    DestinationStatsProcessor,
    DestinationQueueService,
  ],
  exports: [DestinationQueueService],
})
export class DestinationJobsModule {}
