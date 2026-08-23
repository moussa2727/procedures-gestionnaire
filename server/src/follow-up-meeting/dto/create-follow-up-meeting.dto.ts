// follow-up-meeting/dto/create-follow-up-meeting.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TimeSlot } from '@prisma/client';

export class CreateFollowUpMeetingDto {
  @ApiProperty({ description: 'ID de la procédure' })
  @IsUUID()
  @IsNotEmpty()
  procedureId!: string;

  @ApiProperty({ description: 'Date du rendez-vous (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ enum: TimeSlot, description: 'Créneau horaire' })
  @IsEnum(TimeSlot)
  @IsNotEmpty()
  time!: TimeSlot;

  @ApiProperty({
    required: false,
    description: 'Motif du rendez-vous de suivi',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
