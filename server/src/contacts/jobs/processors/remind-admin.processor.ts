// modules/contacts/jobs/processors/remind-admin.processor.ts
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import {
  CONTACT_REMINDER_QUEUE,
  REMIND_ADMIN_JOB,
  REMINDER_THRESHOLD_MS,
} from '../contact-jobs.constants';
import { ContactStatus, UserRole } from '@prisma/client';

@Injectable()
@Processor(CONTACT_REMINDER_QUEUE)
export class RemindAdminProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(RemindAdminProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueueService: EmailQueueService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.log(
      `RemindAdminProcessor instancie et pret a consommer la queue "${CONTACT_REMINDER_QUEUE}"`,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.log(`Worker actif sur le job "${job.name}" (id=${job.id})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(
      `Job "${job.name}" (id=${job.id}) marque comme complet par le worker`,
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
      `Erreur worker sur la queue "${CONTACT_REMINDER_QUEUE}" : ${error?.message}`,
    );
  }

  async process(
    job: Job,
  ): Promise<{ totalPending: number; remindersSent: number }> {
    this.logger.log(
      `Traitement du job "${job.name}" demarre (id=${job.id}, tentative=${job.attemptsMade + 1})`,
    );

    if (job.name !== REMIND_ADMIN_JOB) {
      this.logger.warn(`Job "${job.name}" ignore (non gere par ce processor)`);
      return { totalPending: 0, remindersSent: 0 };
    }

    try {
      const threshold = new Date(Date.now() - REMINDER_THRESHOLD_MS);

      const totalPending = await this.prisma.contact.count({
        where: {
          deletedAt: null,
          status: { in: [ContactStatus.NEW, ContactStatus.READ] },
          createdAt: { lt: threshold },
          reminderSentAt: null,
        },
      });

      if (totalPending === 0) {
        this.logger.debug('Aucun message necessitant un rappel');
        return { totalPending: 0, remindersSent: 0 };
      }

      this.logger.log(`${totalPending} message(s) en attente de rappel`);

      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn('Aucun admin destinataire trouve, rappels ignores');
        return { totalPending, remindersSent: 0 };
      }

      await Promise.all(
        admins.map((admin) =>
          this.emailQueueService.send({
            to: admin.email,
            subject: `${totalPending} message(s) de contact sans reponse`,
            template: 'contacts/contact-reminder-internal',
            context: {
              totalPending,
              thresholdHours: 24,
              date: new Date().toLocaleDateString('fr-FR'),
              time: new Date().toLocaleTimeString('fr-FR'),
            },
          }),
        ),
      );

      await this.prisma.contact.updateMany({
        where: {
          deletedAt: null,
          status: { in: [ContactStatus.NEW, ContactStatus.READ] },
          createdAt: { lt: threshold },
          reminderSentAt: null,
        },
        data: { reminderSentAt: new Date() },
      });

      this.logger.log(
        `${totalPending} message(s) rappeles en batch (${admins.length} admin(s) notifie(s))`,
      );
      return { totalPending, remindersSent: admins.length };
    } catch (error) {
      this.logger.error(
        `Erreur lors du traitement du job "${job.name}" (id=${job.id}): ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
