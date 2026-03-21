import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpsertWorkReviewDto {
  @IsInt({ message: 'rating debe ser un numero entero.' })
  @Min(1, { message: 'rating debe ser al menos 1.' })
  rating: number;

  @IsString({ message: 'comment es obligatorio.' })
  @MinLength(10, { message: 'comment debe tener al menos 10 caracteres.' })
  @MaxLength(2000, { message: 'comment no debe exceder 2000 caracteres.' })
  comment: string;
}
