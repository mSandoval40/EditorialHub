import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmBankMicrodepositDto {
  @IsOptional()
  @IsString({ message: 'amount debe ser texto.' })
  @MaxLength(20, { message: 'amount no debe exceder 20 caracteres.' })
  amount?: string;

  @IsOptional()
  @IsString({ message: 'referenceCode debe ser texto.' })
  @MaxLength(50, { message: 'referenceCode no debe exceder 50 caracteres.' })
  referenceCode?: string;
}
