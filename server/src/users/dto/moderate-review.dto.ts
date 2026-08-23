import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
