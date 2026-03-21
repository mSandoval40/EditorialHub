import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Debes enviar un correo válido.' })
  email: string;
}