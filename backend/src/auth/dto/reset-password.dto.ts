import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Debes enviar un correo válido.' })
  email: string;

  @Matches(/^\d{6}$/, {
    message: 'El código de recuperación debe tener exactamente 6 dígitos.',
  })
  code: string;

  @IsString({ message: 'La nueva contraseña es obligatoria.' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  newPassword: string;

  @IsString({ message: 'Debes confirmar la nueva contraseña.' })
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres.' })
  confirmNewPassword: string;
}