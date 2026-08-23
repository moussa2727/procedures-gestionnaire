import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SanitizeText } from '@/common/decorators/sanitize-text.decorator';

export class RespondReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @SanitizeText()
  response!: string;
}
