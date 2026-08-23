// modules/contacts/dto/bulk-operation.dto.ts
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class BulkOperationDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsOptional()
  @IsBoolean()
  permanent?: boolean = false;
}
