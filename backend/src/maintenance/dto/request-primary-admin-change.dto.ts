import { IsEmail, IsString, MinLength } from 'class-validator';

export class RequestPrimaryAdminChangeDto {
  @IsEmail({}, { message: 'Debes enviar un correo valido para el nuevo ADMIN.' })
  newEmail: string;

  @IsString({ message: 'Debes capturar la contrasena actual del ADMIN.' })
  @MinLength(8, { message: 'La contrasena actual debe tener al menos 8 caracteres.' })
  currentPassword: string;

  @IsString({ message: 'Debes capturar la nueva contrasena del ADMIN.' })
  @MinLength(8, { message: 'La nueva contrasena debe tener al menos 8 caracteres.' })
  newPassword: string;

  @IsString({ message: 'Debes confirmar la nueva contrasena del ADMIN.' })
  @MinLength(8, { message: 'La confirmacion de la nueva contrasena debe tener al menos 8 caracteres.' })
  confirmNewPassword: string;
}
