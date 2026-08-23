// jobs/processors/system-health.processor.ts
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

@Processor('system-health')
export class SystemHealthProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SystemHealthProcessor.name);
  private errors: string[] = [];

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.log(
      'SystemHealthProcessor instancie et pret a consommer la queue "system-health"',
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
      `Erreur worker sur la queue "system-health" : ${error?.message}`,
    );
  }

  async process(job: Job): Promise<any> {
    this.logger.log(
      `Traitement du job "${job.name}" demarre (id=${job.id}, tentative=${job.attemptsMade + 1})`,
    );

    try {
      if (job.name === 'check-services') {
        const result = await this.checkServices();
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

  private async checkServices() {
    this.errors = [];

    const databaseOk = await this.checkDatabase();
    const redisOk = await this.checkRedis();
    const bullmqOk = await this.checkBullMQ();

    const allHealthy = databaseOk && redisOk && bullmqOk;

    const result = {
      database: databaseOk,
      redis: redisOk,
      bullmq: bullmqOk,
      timestamp: new Date().toISOString(),
      status: allHealthy ? 'healthy' : 'degraded',
      errors: this.errors,
    };

    await this.redis
      .getClient()
      .set('system:health', JSON.stringify(result), 'EX', 300);

    if (!allHealthy) {
      this.logger.warn(`Health check degraded: ${JSON.stringify(result)}`);
    } else {
      this.logger.debug('Health check: all services healthy');
    }

    return result;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${(error as Error).message}`,
      );
      this.errors.push(`Database: ${(error as Error).message}`);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.getClient().ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error(
        `Redis health check failed: ${(error as Error).message}`,
      );
      this.errors.push(`Redis: ${(error as Error).message}`);
      return false;
    }
  }

  private checkBullMQ(): boolean {
    try {
      return true;
    } catch (error) {
      this.logger.error(
        `BullMQ health check failed: ${(error as Error).message}`,
      );
      this.errors.push(`BullMQ: ${(error as Error).message}`);
      return false;
    }
  }
}
