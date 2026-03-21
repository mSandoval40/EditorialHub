import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertWorkEditorialDto {
  @IsOptional()
  @IsString({ message: 'editorialBadgeText debe ser texto.' })
  @MaxLength(80, { message: 'editorialBadgeText no debe exceder 80 caracteres.' })
  editorialBadgeText?: string;

  @IsOptional()
  @IsString({ message: 'editorialHeadline debe ser texto.' })
  @MaxLength(180, { message: 'editorialHeadline no debe exceder 180 caracteres.' })
  editorialHeadline?: string;

  @IsOptional()
  @IsString({ message: 'featuredReviewNote debe ser texto.' })
  @MaxLength(500, { message: 'featuredReviewNote no debe exceder 500 caracteres.' })
  featuredReviewNote?: string;

  @IsOptional()
  @IsNumber({}, { message: 'visibleAverageRating debe ser numerico.' })
  @Min(1, { message: 'visibleAverageRating debe ser al menos 1.' })
  @Max(5, { message: 'visibleAverageRating no puede exceder 5.' })
  visibleAverageRating?: number;
}
