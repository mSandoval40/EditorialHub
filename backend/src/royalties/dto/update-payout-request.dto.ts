import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePayoutRequestDto {
  @IsOptional()
  @IsString({ message: 'notes debe ser texto.' })
  @MaxLength(1000, { message: 'notes no debe exceder 1000 caracteres.' })
  notes?: string;
}
