// create-destination.dto.ts — photo retirée, plus aucune saisie d'URL possible
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';

export class CreateDestinationDto {
  @ApiProperty({ example: 'France' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({
    example: "La France maintient sa tradition d'excellence académique...",
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    type: [String],
    description: 'Au moins un consultant doit être affecté à la création',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  consultantIds!: string[];
}
