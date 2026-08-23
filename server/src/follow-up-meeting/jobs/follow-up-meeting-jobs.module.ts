// follow-up-meeting/jobs/follow-up-meeting-jobs.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FollowUpMeetingReminderProcessor } from './processors/follow-up-meeting-reminder.processor';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailModule } from '@/email/email.module';
import { AvailabilityModule } from '@/availability/availability.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AvailabilityModule,
  ],
  providers: [FollowUpMeetingReminderProcessor],
})
export class FollowUpMeetingJobsModule {}
