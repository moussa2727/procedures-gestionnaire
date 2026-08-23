import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum } from 'class-validator';
import { TimeSlot } from '@prisma/client';

export class RescheduleRendezVousDto {
  @ApiProperty({ example: '2026-08-12' })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: TimeSlot })
  @IsEnum(TimeSlot)
  time!: TimeSlot;
}
