// destinations/destinations.module.ts
import { Module } from '@nestjs/common';
import { DestinationController } from './destinations.controller';
import { DestinationService } from './destinations.service';
import { DestinationGateway } from './destinations.gateway';
import { DestinationJobsModule } from './jobs/destination-jobs.module';
import { ConsultantDestinationModule } from './consultant-destination/consultant-destination.module';

@Module({
  imports: [ConsultantDestinationModule, DestinationJobsModule],
  controllers: [DestinationController],
  providers: [DestinationService, DestinationGateway],
  exports: [DestinationService, ConsultantDestinationModule],
})
export class DestinationsModule {}
