import { ApiProperty } from '@nestjs/swagger';
import { AbsenceType } from '@prisma/client';

export class UnavailabilityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  consultantId!: string;

  @ApiProperty()
  startDate!: Date;

  @ApiProperty()
  endDate!: Date;

  @ApiProperty({ enum: AbsenceType })
  type!: AbsenceType;

  @ApiProperty({ required: false, nullable: true })
  reason?: string | null;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: Date;
}
