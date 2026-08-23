// follow-up-meeting/dto/follow-up-meeting-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { MeetingCreator, MeetingStatus, TimeSlot } from '@prisma/client';

export class FollowUpMeetingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  procedureId!: string;

  @ApiProperty()
  consultantId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  date!: Date;

  @ApiProperty({ enum: TimeSlot })
  time!: TimeSlot;

  @ApiProperty({ enum: MeetingCreator })
  createdBy!: MeetingCreator;

  @ApiProperty({ enum: MeetingStatus })
  status!: MeetingStatus;

  @ApiProperty({ required: false, nullable: true })
  reason?: string | null;

  @ApiProperty({ required: false, nullable: true })
  reminderSentAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
