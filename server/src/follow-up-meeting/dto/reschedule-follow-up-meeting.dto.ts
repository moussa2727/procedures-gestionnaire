import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { TimeSlot } from '@prisma/client';

export class RescheduleFollowUpMeetingDto {
  @ApiProperty({ description: 'Nouvelle date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ enum: TimeSlot, description: 'Nouveau créneau horaire' })
  @IsEnum(TimeSlot)
  @IsNotEmpty()
  time!: TimeSlot;
}
