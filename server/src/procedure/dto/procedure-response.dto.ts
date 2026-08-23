// procedure/dto/procedure-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ProcedureStatus, StepStatus } from '@prisma/client';

export class StepResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  stepName!: string;

  @ApiProperty()
  orderIndex!: number;

  @ApiProperty({ enum: StepStatus })
  status!: StepStatus;

  @ApiProperty({ required: false, nullable: true })
  rejectionReason?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "ID de l'étape dont le rejet a provoqué l'annulation en cascade de celle-ci",
  })
  cascadeCancelledFromStepId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProcedureResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  numeroDossier!: string;

  @ApiProperty()
  rendezVousId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  consultantId!: string;

  @ApiProperty()
  destinationId!: string;

  @ApiProperty({ enum: ProcedureStatus })
  status!: ProcedureStatus;

  @ApiProperty({ required: false, nullable: true })
  cancellationReason?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [StepResponseDto], required: false })
  steps?: StepResponseDto[];

  @ApiProperty({ type: [CommentResponseDto], required: false })
  comments?: CommentResponseDto[];
}
