import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_JOB_TYPES, EMAIL_QUEUE } from '../email-job.constants';
import { EmailService } from '@/email/email.service';

export interface EmailJobPayload {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Injectable()
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.debug(`Email job active: ${job.name} (${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Email job failed: ${job.name} (${job.id}) -> ${error.message}`,
    );
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    if (job.name !== EMAIL_JOB_TYPES.SEND) {
      return;
    }

    const { to, subject, template, context } = job.data;
    await this.emailService.send({ to, subject, template, context });
  }
}
