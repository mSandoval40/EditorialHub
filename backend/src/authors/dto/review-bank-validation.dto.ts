import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewBankValidationDto {
  @IsOptional()
  @IsString({ message: 'notes debe ser texto.' })
  @IsNotEmpty({ message: 'notes no puede ir vacio.' })
  @MaxLength(1000, { message: 'notes no debe exceder 1000 caracteres.' })
  notes?: string;
}
