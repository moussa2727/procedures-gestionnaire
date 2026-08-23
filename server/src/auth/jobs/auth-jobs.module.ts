import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenCleanupProcessor } from './processors/token-cleanup.processor';
import { SessionCleanupProcessor } from './processors/session-cleanup.processor';
import { SessionService } from '../session.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TokenCleanupProcessor, SessionCleanupProcessor, SessionService],
})
export class AuthJobsModule {}
