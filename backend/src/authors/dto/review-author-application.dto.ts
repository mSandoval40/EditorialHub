import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ReviewAuthorApplicationDto {
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message:
      'royaltyRatePercent debe ser un número válido con hasta 2 decimales, por ejemplo 30 o 30.00.',
  })
  royaltyRatePercent?: string;

  @IsOptional()
  @IsString({ message: 'rejectionReason debe ser texto.' })
  @IsNotEmpty({ message: 'rejectionReason no puede ir vacío.' })
  @MaxLength(1000, { message: 'rejectionReason no debe exceder 1000 caracteres.' })
  rejectionReason?: string;
}
