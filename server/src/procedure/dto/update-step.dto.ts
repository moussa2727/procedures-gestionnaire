// procedure/dto/update-step.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StepStatus } from '@prisma/client';

export class UpdateStepDto {
  @ApiProperty({ enum: StepStatus })
  @IsEnum(StepStatus)
  status!: StepStatus;

  @ApiProperty({
    required: false,
    description: 'Obligatoire si status = REJECTED',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
