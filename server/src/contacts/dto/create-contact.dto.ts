// modules/contacts/dto/create-contact.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SanitizeText } from '@/common/decorators/sanitize-text.decorator';

export class CreateContactDto {
  @IsString()
  @IsOptional()
  @Length(2, 100)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim().toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 5000)
  @SanitizeText()
  message!: string;

  @IsOptional()
  @IsString()
  website?: string;
}
