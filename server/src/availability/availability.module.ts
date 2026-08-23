// availability/availability.module.ts
import { Global, Module, OnModuleInit } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { HolidayService } from './holiday.service';
import { ConsultantDestinationModule } from '@/destinations/consultant-destination/consultant-destination.module';
import { AvailabilityController } from './availability.controller';
import { ConsultantUnavailabilityModule } from './consultant-unaivailability/unavailability.module';

@Global()
@Module({
  imports: [ConsultantDestinationModule, ConsultantUnavailabilityModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, HolidayService],
  exports: [AvailabilityService, HolidayService],
})
export class AvailabilityModule implements OnModuleInit {
  constructor(private readonly holidayService: HolidayService) {}

  onModuleInit(): void {
    this.holidayService.preloadYears();
  }
}
