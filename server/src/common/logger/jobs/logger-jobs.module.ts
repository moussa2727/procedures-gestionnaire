// common/logger/jobs/logger-jobs.module.ts
import { Module, Global, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SystemLogProcessor } from './processors/system-log.processor';
import { SystemBackupProcessor } from './processors/system-backup.processor';
import { SystemHealthProcessor } from './processors/system-health.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'system-log' },
      { name: 'system-backup' },
      { name: 'system-health' },
    ),
  ],
  providers: [SystemLogProcessor, SystemBackupProcessor, SystemHealthProcessor],
  exports: [BullModule],
})
export class SystemJobsModule implements OnModuleInit {
  constructor(
    @InjectQueue('system-log') private readonly logQueue: Queue,
    @InjectQueue('system-backup') private readonly backupQueue: Queue,
    @InjectQueue('system-health') private readonly healthQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.removeExistingJobs();

    await this.logQueue.upsertJobScheduler(
      'rotate-logs-scheduler',
      { pattern: '0 3 * * *' },
      {
        name: 'rotate-logs',
        data: {},
        opts: { removeOnComplete: true, removeOnFail: false },
      },
    );

    await this.backupQueue.upsertJobScheduler(
      'backup-database-scheduler',
      { pattern: '0 2 * * *' },
      {
        name: 'backup-database',
        data: {},
        opts: { removeOnComplete: true, removeOnFail: false },
      },
    );

    await this.healthQueue.upsertJobScheduler(
      'check-services-scheduler',
      { pattern: '*/5 * * * *' },
      {
        name: 'check-services',
        data: {},
        opts: { removeOnComplete: true, removeOnFail: false },
      },
    );
  }

  private async removeExistingJobs(): Promise<void> {
    try {
      const schedulers = await this.logQueue.getJobSchedulers();
      for (const scheduler of schedulers) {
        if (scheduler.name === 'rotate-logs-scheduler') {
          await this.logQueue.removeJobScheduler('rotate-logs-scheduler');
        }
      }

      const backupSchedulers = await this.backupQueue.getJobSchedulers();
      for (const scheduler of backupSchedulers) {
        if (scheduler.name === 'backup-database-scheduler') {
          await this.backupQueue.removeJobScheduler(
            'backup-database-scheduler',
          );
        }
      }

      const healthSchedulers = await this.healthQueue.getJobSchedulers();
      for (const scheduler of healthSchedulers) {
        if (scheduler.name === 'check-services-scheduler') {
          await this.healthQueue.removeJobScheduler('check-services-scheduler');
        }
      }
    } catch (error) {}
  }
}
