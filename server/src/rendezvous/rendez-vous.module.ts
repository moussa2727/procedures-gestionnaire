// rendez-vous/rendez-vous.module.ts
import { Module } from '@nestjs/common';
import { RendezVousController } from './rendez-vous.controller';
import { RendezVousService } from './rendez-vous.service';
import { RendezVousGateway } from './rendez-vous.gateway';
import { RendezVousJobsModule } from './jobs/rendez-vous-jobs.module';

@Module({
  imports: [RendezVousJobsModule],
  controllers: [RendezVousController],
  providers: [RendezVousService, RendezVousGateway],
  exports: [RendezVousService],
})
export class RendezVousModule {}
