import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import {
  DESTINATION_JOBS,
  DESTINATION_QUEUES,
} from '../constants/destination-jobs.constants';

@Processor(DESTINATION_QUEUES.CACHE)
export class DestinationCacheProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(DestinationCacheProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.log(
      `DestinationCacheProcessor instancie et pret a consommer la queue "${DESTINATION_QUEUES.CACHE}"`,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.log(`Worker actif sur le job "${job.name}" (id=${job.id})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(
      `Job "${job.name}" (id=${job.id}) marque comme complete par le worker`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job "${job?.name}" (id=${job?.id}) marque comme echoue par le worker : ${error?.message}`,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(
      `Erreur worker sur la queue "${DESTINATION_QUEUES.CACHE}" : ${error?.message}`,
    );
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(
      `Traitement du job "${job.name}" demarre (id=${job.id}, tentative=${job.attemptsMade + 1})`,
    );

    try {
      if (job.name === DESTINATION_JOBS.PRELOAD_CACHE) {
        const result = await this.preloadCache();
        this.logger.log(
          `Traitement du job "${job.name}" termine avec succes (id=${job.id})`,
        );
        return result;
      }
      this.logger.warn(
        `Job "${job.name}" recu mais aucun handler correspondant (id=${job.id})`,
      );
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(
        `Echec du traitement du job "${job.name}" (id=${job.id}) : ${message}`,
      );
      throw err;
    }
  }

  private async preloadCache() {
    const destinations = await this.prisma.destination.findMany({
      where: { isDeleted: false },
    });
    await this.redis
      .getClient()
      .set('destinations:all', JSON.stringify(destinations), 'EX', 86400);
    this.logger.log(`Preloaded ${destinations.length} destinations into cache`);
    return { preloaded: destinations.length };
  }
}
