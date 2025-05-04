import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AuthPayload } from '../types/auth-jwtPayload';
import { Inject, Injectable } from '@nestjs/common';
import jwtConfig from 'src/configuration/jwt.config';
import * as config from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly cfg: config.ConfigType<typeof jwtConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.publicKey!,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: AuthPayload) {
    const userId = payload.sub;
    return this.authService.validateJwtUser(userId);
  }
}
