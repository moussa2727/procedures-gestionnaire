import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import {
  DESTINATION_JOBS,
  DESTINATION_QUEUES,
} from '../constants/destination-jobs.constants';

@Processor(DESTINATION_QUEUES.STATS)
export class DestinationStatsProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(DestinationStatsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.log(
      `DestinationStatsProcessor instancie et pret a consommer la queue "${DESTINATION_QUEUES.STATS}"`,
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
      `Erreur worker sur la queue "${DESTINATION_QUEUES.STATS}" : ${error?.message}`,
    );
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(
      `Traitement du job "${job.name}" demarre (id=${job.id}, tentative=${job.attemptsMade + 1})`,
    );

    try {
      if (job.name === DESTINATION_JOBS.UPDATE_STATS) {
        const result = await this.updateStatistics();
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

  private async updateStatistics() {
    const total = await this.prisma.destination.count({
      where: { isDeleted: false },
    });

    const withoutActiveConsultant = await this.prisma.destination.findMany({
      where: {
        isDeleted: false,
        consultants: {
          none: { consultant: { isDeleted: false, isActive: true } },
        },
      },
      select: { id: true, country: true },
    });

    if (withoutActiveConsultant.length > 0) {
      this.logger.warn(
        `${withoutActiveConsultant.length} destination(s) sans consultant actif detectee(s) — violation potentielle d'invariant metier`,
      );
    }

    const stats = {
      total,
      withoutActiveConsultantCount: withoutActiveConsultant.length,
      withoutActiveConsultantIds: withoutActiveConsultant.map((d) => d.id),
      updatedAt: new Date(),
    };

    await this.redis
      .getClient()
      .set('stats:destinations', JSON.stringify(stats), 'EX', 86400);
    this.logger.log('Updated destination statistics');
    return stats;
  }
}
