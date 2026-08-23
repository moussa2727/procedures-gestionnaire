import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AbsenceType } from '@prisma/client';

export class CreateUnavailabilityDto {
  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-08-22' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: AbsenceType })
  @IsEnum(AbsenceType)
  type!: AbsenceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
