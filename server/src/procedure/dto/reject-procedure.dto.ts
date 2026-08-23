// procedure/dto/reject-procedure.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectProcedureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
