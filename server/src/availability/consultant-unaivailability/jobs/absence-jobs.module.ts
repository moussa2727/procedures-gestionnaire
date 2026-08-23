import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AbsenceCleanupProcessor } from './absence-cleanup.processor';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AbsenceCleanupProcessor],
})
export class AbsenceJobsModule {}
