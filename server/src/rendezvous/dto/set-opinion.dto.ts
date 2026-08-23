import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Opinion } from '@prisma/client';

export class SetOpinionDto {
  @ApiProperty({ enum: Opinion })
  @IsEnum(Opinion)
  opinion!: Opinion;
}
