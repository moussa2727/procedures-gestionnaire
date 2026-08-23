import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { TimeSlot } from '@prisma/client';

export class CreateRendezVousDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consultantId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destinationId!: string;

  @ApiProperty({ example: '2026-08-10' })
  @IsDateString()
  date!: string;

  @ApiProperty({ enum: TimeSlot })
  @IsEnum(TimeSlot)
  time!: TimeSlot;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sector!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studyLevel!: string;
}
