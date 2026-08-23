// modules/contacts/dto/reply-contact.dto.ts
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ReplyContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 5000)
  reply!: string;
}
