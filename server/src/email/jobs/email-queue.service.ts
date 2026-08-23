import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EMAIL_JOB_TYPES, EMAIL_QUEUE } from './email-job.constants';

export interface EnqueueEmailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, unknown>;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async send(options: EnqueueEmailOptions): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB_TYPES.SEND,
      {
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context ?? {},
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.debug(`Email queued: ${options.template} -> ${options.to}`);
  }
}
