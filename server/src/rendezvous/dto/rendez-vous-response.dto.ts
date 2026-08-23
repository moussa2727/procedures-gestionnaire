import { ApiProperty } from '@nestjs/swagger';
import { Opinion, RendezvousStatus, TimeSlot } from '@prisma/client';

export class RendezVousResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  consultantId!: string;

  @ApiProperty()
  destinationId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  sector!: string;

  @ApiProperty()
  studyLevel!: string;

  @ApiProperty()
  date!: Date;

  @ApiProperty({ enum: TimeSlot })
  time!: TimeSlot;

  @ApiProperty({ enum: RendezvousStatus })
  status!: RendezvousStatus;

  @ApiProperty({ enum: Opinion, required: false, nullable: true })
  opinion?: Opinion | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  cancellationReason?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
