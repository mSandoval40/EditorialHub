import { AuthorProfileType } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ApplyAuthorDto {
  @IsString({ message: 'publicName es obligatorio.' })
  @MinLength(2, { message: 'publicName debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'publicName no debe exceder 120 caracteres.' })
  publicName: string;

  @IsEnum(AuthorProfileType, {
    message: 'authorProfileType debe ser CERTIFIED o ANONYMOUS.',
  })
  authorProfileType: AuthorProfileType;

  @IsOptional()
  @IsString({ message: 'legalName debe ser texto.' })
  @MaxLength(150, { message: 'legalName no debe exceder 150 caracteres.' })
  legalName?: string;

  @IsOptional()
  @IsString({ message: 'bio debe ser texto.' })
  @MaxLength(1000, { message: 'bio no debe exceder 1000 caracteres.' })
  bio?: string;

  @IsOptional()
  @IsString({ message: 'taxId debe ser texto.' })
  @MaxLength(100, { message: 'taxId no debe exceder 100 caracteres.' })
  taxId?: string;

  @IsOptional()
  @IsString({ message: 'taxIdLetters debe ser texto.' })
  @MaxLength(4, { message: 'taxIdLetters no debe exceder 4 caracteres.' })
  taxIdLetters?: string;

  @IsOptional()
  @IsString({ message: 'taxIdDatePart debe ser texto.' })
  @MaxLength(6, { message: 'taxIdDatePart no debe exceder 6 caracteres.' })
  taxIdDatePart?: string;

  @IsOptional()
  @IsString({ message: 'taxIdHomoclave debe ser texto.' })
  @MaxLength(3, { message: 'taxIdHomoclave no debe exceder 3 caracteres.' })
  taxIdHomoclave?: string;

  @IsOptional()
  @IsString({ message: 'curp debe ser texto.' })
  @MaxLength(18, { message: 'curp no debe exceder 18 caracteres.' })
  curp?: string;

  @IsOptional()
  @IsString({ message: 'dateOfBirth debe ser texto en formato ISO.' })
  dateOfBirth?: string;

  @IsOptional()
  @IsString({ message: 'payoutMethod debe ser texto.' })
  @MaxLength(100, { message: 'payoutMethod no debe exceder 100 caracteres.' })
  payoutMethod?: string;

  @IsOptional()
  @IsObject({ message: 'payoutAccountData debe ser un objeto JSON.' })
  payoutAccountData?: Record<string, unknown>;
}
