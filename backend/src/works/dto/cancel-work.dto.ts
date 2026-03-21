import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelWorkDto {
  @IsString({ message: 'cancellationReason es obligatorio.' })
  @MinLength(5, { message: 'cancellationReason debe tener al menos 5 caracteres.' })
  @MaxLength(1000, { message: 'cancellationReason no debe exceder 1000 caracteres.' })
  cancellationReason: string;
}
