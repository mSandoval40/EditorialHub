import { IsISO8601, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectWorkDto {
  @IsString({ message: 'rejectionReason es obligatorio.' })
  @MinLength(5, { message: 'rejectionReason debe tener al menos 5 caracteres.' })
  @MaxLength(1000, { message: 'rejectionReason no debe exceder 1000 caracteres.' })
  rejectionReason: string;

  @IsISO8601(
    {},
    {
      message: 'resubmittableAfter es obligatorio y debe ser una fecha valida en formato ISO 8601.',
    },
  )
  resubmittableAfter: string;
}
