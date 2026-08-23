// follow-up-meeting/follow-up-meeting.module.ts
import { Module } from '@nestjs/common';
import { FollowUpMeetingController } from './follow-up-meeting.controller';
import { FollowUpMeetingService } from './follow-up-meeting.service';
import { FollowUpMeetingGateway } from './follow-up-meeting.gateway';
import { FollowUpMeetingJobsModule } from './jobs/follow-up-meeting-jobs.module';

@Module({
  imports: [FollowUpMeetingJobsModule],
  controllers: [FollowUpMeetingController],
  providers: [FollowUpMeetingService, FollowUpMeetingGateway],
  exports: [FollowUpMeetingService],
})
export class FollowUpMeetingModule {}
