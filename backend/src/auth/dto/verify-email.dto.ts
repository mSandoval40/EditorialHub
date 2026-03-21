import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Debes enviar un correo válido.' })
  email: string;

  @Matches(/^\d{6}$/, {
    message: 'El código de verificación debe tener exactamente 6 dígitos.',
  })
  code: string;
}