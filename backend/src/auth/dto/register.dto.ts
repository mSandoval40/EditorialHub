import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Debes enviar un correo válido.' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @IsString({ message: 'Debes confirmar la contraseña.' })
  @MinLength(8, { message: 'La confirmación debe tener al menos 8 caracteres.' })
  confirmPassword: string;
}