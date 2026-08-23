// modules/contacts/jobs/processors/contact-reconciliation.processor.ts
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import {
  CONTACT_RECONCILIATION_QUEUE,
  RECONCILE_CREATE_JOB,
  RECONCILE_REPLY_JOB,
} from '../contact-reconciliation.constants';
import { AuditAction, ContactStatus } from '@prisma/client';

interface ReconcileCreateData {
  name?: string;
  email: string;
  message: string;
  ipAddress: string;
}

interface ReconcileReplyData {
  contactId: string;
  reply: string;
  adminId: string;
}

@Processor(CONTACT_RECONCILIATION_QUEUE)
export class ContactReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ContactReconciliationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueueService: EmailQueueService,
  ) {
    super();
  }

  async process(
    job: Job<ReconcileCreateData | ReconcileReplyData>,
  ): Promise<void> {
    this.logger.debug(`Processing job ${job.id} (${job.name})`);

    if (job.name === RECONCILE_CREATE_JOB) {
      await this.handleReconcileCreate(job.data as ReconcileCreateData);
      return;
    }

    if (job.name === RECONCILE_REPLY_JOB) {
      await this.handleReconcileReply(job.data as ReconcileReplyData);
      return;
    }

    this.logger.warn(`Job ${job.name} non reconnu`);
  }

  private async handleReconcileCreate(
    data: ReconcileCreateData,
  ): Promise<void> {
    const existing = await this.prisma.contact.findFirst({
      where: { email: data.email, message: data.message },
    });

    if (existing) {
      this.logger.debug(`Contact deja existant pour ${data.email}, ignore`);
      return;
    }

    const contactName = data.name ?? '';

    const contact = await this.prisma.contact.create({
      data: {
        name: contactName,
        email: data.email,
        message: data.message,
        ipAddress: data.ipAddress,
        status: ContactStatus.NEW,
      },
    });

    this.logger.log(
      `Contact reconcilie avec succes: ${contact.id} (${contact.email})`,
    );

    await this.prisma.auditLog.create({
      data: {
        userId: null,
        action: AuditAction.CREATE,
        entity: 'Contact',
        entityId: contact.id,
        success: true,
        ipAddress: data.ipAddress,
        metadata: { email: data.email, reconciled: true },
      },
    });

    try {
      const adminEmail = process.env.EMAIL_FROM;
      if (adminEmail) {
        await this.emailQueueService.send({
          to: adminEmail,
          subject: `Nouveau message de contact - ${contactName}`,
          template: 'contacts/contact-notification-admin',
          context: {
            name: contactName,
            email: data.email,
            message: data.message,
            contactId: contact.id,
            adminUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            createdAt: new Date().toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Echec envoi notification admin pour ${contact.id}: ${(error as Error).message}`,
      );
    }

    await this.emailQueueService.send({
      to: data.email,
      subject: 'Confirmation de reception de votre message',
      template: 'contacts/contact-confirmation',
      context: {
        name: contactName,
        message: data.message,
      },
    });
  }

  private async handleReconcileReply(data: ReconcileReplyData): Promise<void> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: data.contactId },
    });

    if (!contact) {
      this.logger.warn(
        `Message ${data.contactId} introuvable pour reconciliation de reponse`,
      );
      return;
    }

    if (contact.status === ContactStatus.REPLIED) {
      this.logger.debug(`Message ${data.contactId} deja repondu, ignore`);
      return;
    }

    const updated = await this.prisma.contact.update({
      where: { id: data.contactId },
      data: {
        reply: data.reply,
        status: ContactStatus.REPLIED,
        repliedAt: new Date(),
        repliedById: data.adminId,
      },
    });

    this.logger.log(`Reponse reconciliee pour le contact ${data.contactId}`);

    await this.prisma.auditLog.create({
      data: {
        userId: data.adminId,
        action: AuditAction.RESPOND,
        entity: 'Contact',
        entityId: data.contactId,
        success: true,
        metadata: { reconciled: true },
      },
    });

    try {
      await this.emailQueueService.send({
        to: contact.email,
        subject: 'Reponse a votre message',
        template: 'contacts/contact-reply',
        context: {
          name: contact.name,
          message: contact.message,
          reply: data.reply,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Echec envoi email de reponse pour ${contact.id}: ${(error as Error).message}`,
      );
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Reconciliation definitivement echouee pour le job ${job.id} (${job.name}) : ${error.message}. ` +
        `Donnees : ${JSON.stringify(job.data)}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) termine avec succes`);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Erreur worker: ${error.message}`);
  }
}
