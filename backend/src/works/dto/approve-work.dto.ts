import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveWorkDto {
  @IsOptional()
  @IsString({ message: 'editorialNotes debe ser texto.' })
  @MaxLength(1000, {
    message: 'editorialNotes no debe exceder 1000 caracteres.',
  })
  editorialNotes?: string;
}
