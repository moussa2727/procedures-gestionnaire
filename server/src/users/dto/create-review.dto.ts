import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MIN_RATING_REQUIRING_COMMENT } from '../users.constants';
import { SanitizeText } from '@/common/decorators/sanitize-text.decorator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ValidateIf((o) => o.rating <= MIN_RATING_REQUIRING_COMMENT)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @SanitizeText()
  comment?: string;
}
