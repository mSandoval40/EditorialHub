import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class CreateCheckoutDto {
  @IsBoolean({ message: 'acceptTerms debe ser true o false.' })
  acceptTerms!: boolean;

  @IsString({ message: 'termsVersion debe ser texto.' })
  @MaxLength(50, { message: 'termsVersion no debe exceder 50 caracteres.' })
  termsVersion!: string;
}
