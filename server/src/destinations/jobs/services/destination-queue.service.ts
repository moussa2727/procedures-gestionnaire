import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DESTINATION_JOBS,
  DESTINATION_QUEUES,
} from '../constants/destination-jobs.constants';

@Injectable()
export class DestinationQueueService {
  private readonly logger = new Logger(DestinationQueueService.name);

  constructor(
    @InjectQueue(DESTINATION_QUEUES.CACHE) private readonly cacheQueue: Queue,
    @InjectQueue(DESTINATION_QUEUES.CLEANUP)
    private readonly cleanupQueue: Queue,
    @InjectQueue(DESTINATION_QUEUES.STATS) private readonly statsQueue: Queue,
  ) {}

  async preloadCache(): Promise<{ jobId: string; queue: string }> {
    const job = await this.cacheQueue.add(
      DESTINATION_JOBS.PRELOAD_CACHE,
      {},
      { jobId: 'preload-cache', removeOnComplete: true },
    );

    if (!job.id) {
      throw new Error('Failed to create preload-cache job');
    }

    this.logger.log(`Job preload-cache enqueued (id=${job.id})`);
    return { jobId: job.id, queue: DESTINATION_QUEUES.CACHE };
  }

  async cleanupOrphanedImages(): Promise<{ jobId: string; queue: string }> {
    const job = await this.cleanupQueue.add(
      DESTINATION_JOBS.CLEANUP_IMAGES,
      {},
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 30000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    if (!job.id) {
      throw new Error('Failed to create cleanup-orphaned-images job');
    }

    this.logger.log(`Job cleanup-orphaned-images enqueued (id=${job.id})`);
    return { jobId: job.id, queue: DESTINATION_QUEUES.CLEANUP };
  }

  async updateStatistics(): Promise<{ jobId: string; queue: string }> {
    const job = await this.statsQueue.add(
      DESTINATION_JOBS.UPDATE_STATS,
      {},
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    if (!job.id) {
      throw new Error('Failed to create update-statistics job');
    }

    this.logger.log(`Job update-statistics enqueued (id=${job.id})`);
    return { jobId: job.id, queue: DESTINATION_QUEUES.STATS };
  }
}
