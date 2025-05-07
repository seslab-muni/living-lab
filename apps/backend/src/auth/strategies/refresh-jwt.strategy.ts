import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AuthPayload } from '../types/auth-jwt-payload';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as config from '@nestjs/config';
import refreshConfig from 'src/configuration/refresh.config';
import { Request } from 'express';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(refreshConfig.KEY)
    private readonly cfg: config.ConfigType<typeof refreshConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.secret!,
    });
  }

  async validate(req: Request, payload: AuthPayload) {
    const refreshToken = req.get('authorization')?.replace('Bearer', '').trim();
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Authorization header is missing or malformed',
      );
    }
    const newTokens = await this.authService.validateRefreshTokenValid(
      payload.sub,
      refreshToken,
    );
    if (!newTokens) {
      throw new UnauthorizedException('Refresh token is invalid');
    }
    return newTokens;
  }
}
