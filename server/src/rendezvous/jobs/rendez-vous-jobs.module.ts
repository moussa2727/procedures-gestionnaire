// rendez-vous/jobs/rendez-vous-jobs.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailModule } from '@/email/email.module';
import { AvailabilityModule } from '@/availability/availability.module';
import { RendezVousReminderProcessor } from './rendez-vous-reminder.processor';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AvailabilityModule,
  ],
  providers: [RendezVousReminderProcessor],
})
export class RendezVousJobsModule {}
