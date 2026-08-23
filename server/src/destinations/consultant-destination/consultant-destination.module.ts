// destinations/consultant-destination/consultant-destination.module.ts
import { Module } from '@nestjs/common';
import { ConsultantDestinationService } from './consultant-destination.service';
import { ConsultantDestinationController } from './consultant-destination.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConsultantDestinationController],
  providers: [ConsultantDestinationService],
  exports: [ConsultantDestinationService],
})
export class ConsultantDestinationModule {}
