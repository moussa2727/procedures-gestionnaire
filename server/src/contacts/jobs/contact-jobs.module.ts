// contacts/jobs/contact-jobs.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailModule } from '@/email/email.module';
import { RedisModule } from '@/redis/redis.module';
import { DeleteOldMessagesProcessor } from './processors/delete-old-messages.processor';
import { RemindAdminProcessor } from './processors/remind-admin.processor';
import { ContactReconciliationProcessor } from './processors/contact-reconciliation.processor';
import {
  CONTACT_CLEANUP_QUEUE,
  CONTACT_REMINDER_QUEUE,
  DELETE_OLD_MESSAGES_JOB,
  REMIND_ADMIN_JOB,
} from './contact-jobs.constants';
import { CONTACT_RECONCILIATION_QUEUE } from './contact-reconciliation.constants';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    RedisModule,
    BullModule.registerQueue(
      { name: CONTACT_CLEANUP_QUEUE },
      { name: CONTACT_REMINDER_QUEUE },
      {
        name: CONTACT_RECONCILIATION_QUEUE,
        defaultJobOptions: { removeOnComplete: true, removeOnFail: false },
      },
    ),
  ],
  providers: [
    DeleteOldMessagesProcessor,
    RemindAdminProcessor,
    ContactReconciliationProcessor,
  ],
  exports: [BullModule],
})
export class ContactJobsModule implements OnModuleInit {
  constructor(
    @InjectQueue(CONTACT_CLEANUP_QUEUE) private readonly cleanupQueue: Queue,
    @InjectQueue(CONTACT_REMINDER_QUEUE) private readonly reminderQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.cleanupQueue.upsertJobScheduler(
      `${DELETE_OLD_MESSAGES_JOB}-scheduler`,
      { pattern: '0 3 * * *' },
      { name: DELETE_OLD_MESSAGES_JOB, data: {} },
    );

    await this.reminderQueue.upsertJobScheduler(
      `${REMIND_ADMIN_JOB}-scheduler`,
      { pattern: '0 * * * *' },
      { name: REMIND_ADMIN_JOB, data: {} },
    );
  }
}
