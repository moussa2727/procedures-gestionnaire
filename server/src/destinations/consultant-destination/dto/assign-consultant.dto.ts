import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignConsultantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consultantId!: string;
}
