import { IsString, MinLength } from 'class-validator';

export class ResolvePrimaryAdminChangeDto {
  @IsString({ message: 'Debes enviar el token de aprobacion.' })
  @MinLength(24, { message: 'El token de aprobacion no es valido.' })
  token: string;
}
