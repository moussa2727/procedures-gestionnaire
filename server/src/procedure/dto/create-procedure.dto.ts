// procedure/dto/create-procedure.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

export class CreateProcedureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rendezVousId!: string;

  @ApiProperty({ type: [String], description: "Noms des étapes dans l'ordre" })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  stepNames!: string[];
}
