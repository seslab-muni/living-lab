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
    const cfgAny = cfg as Record<string, unknown>;
    const secret =
      typeof cfgAny.secret === 'string' ? cfgAny.secret : undefined;
    const publicKey =
      typeof cfgAny.publicKey === 'string' ? cfgAny.publicKey : undefined;

    const isMockMode = Boolean(secret);
    const secretOrKey = isMockMode
      ? (secret ?? 'mock-key')
      : (publicKey ?? 'mock-key');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms: [isMockMode ? 'HS256' : 'RS256'],
    });
  }

  async validate(req: Request, payload: AuthPayload) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Authorization header is missing or malformed',
      );
    }
    const newTokens = await this.authService.validateRefreshTokenValid(
      payload.sub.id,
      refreshToken,
    );
    if (!newTokens) {
      throw new UnauthorizedException('Refresh token is invalid');
    }
    return newTokens;
  }
}
