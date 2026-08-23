// modules/contacts/jobs/processors/delete-old-messages.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import {
  CLEANUP_LAST_RUN_KEY,
  CLEANUP_LOCK_TTL_SECONDS,
  CONTACT_CLEANUP_QUEUE,
  DELETE_OLD_MESSAGES_JOB,
  MESSAGE_MAX_AGE_MS,
} from '../contact-jobs.constants';

const ARCHIVE_BATCH_SIZE = 200;

@Processor(CONTACT_CLEANUP_QUEUE)
export class DeleteOldMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(DeleteOldMessagesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ skipped: boolean; archived?: number; deleted?: number }> {
    if (job.name !== DELETE_OLD_MESSAGES_JOB) return { skipped: true };

    const client = this.redis.getClient();

    const acquired = await client.set(
      CLEANUP_LAST_RUN_KEY,
      new Date().toISOString(),
      'EX',
      CLEANUP_LOCK_TTL_SECONDS,
      'NX',
    );

    if (acquired !== 'OK') {
      this.logger.log(
        'Nettoyage deja effectue au cours des 7 derniers jours, operation ignoree',
      );
      return { skipped: true };
    }

    const cutoffDate = new Date(Date.now() - MESSAGE_MAX_AGE_MS);

    try {
      let totalArchived = 0;
      let totalDeleted = 0;

      while (true) {
        const batch = await this.prisma.contact.findMany({
          where: { createdAt: { lt: cutoffDate } },
          take: ARCHIVE_BATCH_SIZE,
        });

        if (batch.length === 0) break;

        await this.prisma.$transaction([
          this.prisma.contactArchive.createMany({
            data: batch.map((contact) => ({
              originalId: contact.id,
              name: contact.name || '',
              email: contact.email,
              message: contact.message,
              reply: contact.reply,
              createdAt: contact.createdAt,
              repliedAt: contact.repliedAt,
            })),
          }),
          this.prisma.contact.deleteMany({
            where: { id: { in: batch.map((contact) => contact.id) } },
          }),
        ]);

        totalArchived += batch.length;
        totalDeleted += batch.length;

        if (batch.length < ARCHIVE_BATCH_SIZE) break;
      }

      this.logger.log(
        `${totalDeleted} message(s) de plus d'un an archive(s) puis supprime(s) de la table active`,
      );
      return { skipped: false, archived: totalArchived, deleted: totalDeleted };
    } catch (error) {
      await client.del(CLEANUP_LAST_RUN_KEY);
      this.logger.error(
        'Echec du nettoyage des anciens messages de contact',
        error,
      );
      throw error;
    }
  }
}
