// procedure/dto/cancel-procedure.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelProcedureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
