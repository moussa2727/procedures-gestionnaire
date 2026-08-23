// email/email.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { EmailQueueService } from './jobs/email-queue.service';
import { EmailProcessor } from './jobs/processors/email.processor';
import { EMAIL_QUEUE } from './jobs/email-job.constants';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [EmailService, EmailQueueService, EmailProcessor],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
