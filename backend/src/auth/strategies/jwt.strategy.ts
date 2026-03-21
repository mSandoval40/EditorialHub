import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: string;
  email: string;
  roles: RoleName[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'editorialhub_backend_dev_secret_change_this',
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}