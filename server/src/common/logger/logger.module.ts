import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { LoggerService } from './logger.service';
import { SystemJobsModule } from './jobs/logger-jobs.module';

@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig), SystemJobsModule],

  providers: [LoggerService],
  exports: [LoggerService, WinstonModule],
})
export class LoggerModule {}
