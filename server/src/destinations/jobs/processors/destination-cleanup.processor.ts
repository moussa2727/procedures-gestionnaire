import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import {
  DESTINATION_JOBS,
  DESTINATION_QUEUES,
} from '../constants/destination-jobs.constants';

@Processor(DESTINATION_QUEUES.CLEANUP)
export class DestinationCleanupProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(DestinationCleanupProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.log(
      `DestinationCleanupProcessor instancie et pret a consommer la queue "${DESTINATION_QUEUES.CLEANUP}"`,
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
      `Erreur worker sur la queue "${DESTINATION_QUEUES.CLEANUP}" : ${error?.message}`,
    );
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(
      `Traitement du job "${job.name}" demarre (id=${job.id}, tentative=${job.attemptsMade + 1})`,
    );

    try {
      if (job.name === DESTINATION_JOBS.CLEANUP_IMAGES) {
        const result = await this.cleanupOrphanedImages();
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

  private async cleanupOrphanedImages() {
    const destinations = await this.prisma.destination.findMany({
      where: { isDeleted: false },
    });
    const validPublicIds = destinations
      .map((d) => d.photoPublicId)
      .filter((id): id is string => !!id && !id.startsWith('/images/'));

    const deleted = await this.cloudinary.cleanupOrphanedFiles(validPublicIds);
    this.logger.log(`Cleaned up ${deleted.length} orphaned images`);
    return { deleted: deleted.length, files: deleted };
  }
}
