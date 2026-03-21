import { PublicationType } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateWorkDto {
  @IsOptional()
  @IsString({ message: 'title debe ser texto.' })
  @MinLength(2, { message: 'title debe tener al menos 2 caracteres.' })
  @MaxLength(180, { message: 'title no debe exceder 180 caracteres.' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'description debe ser texto.' })
  @MaxLength(5000, { message: 'description no debe exceder 5000 caracteres.' })
  description?: string;

  @IsOptional()
  @IsEnum(PublicationType, {
    message: 'publicationType debe ser BOOK, MAGAZINE, ARTICLE o OTHER.',
  })
  publicationType?: PublicationType;

  @IsOptional()
  @IsObject({ message: 'metadata debe ser un objeto JSON.' })
  metadata?: Record<string, unknown>;
}
