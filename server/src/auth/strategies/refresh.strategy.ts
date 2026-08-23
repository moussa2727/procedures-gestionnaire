import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { RefreshJwtPayload } from '@/common/interfaces/jwt-payload.interface';

const cookieExtractor = (req: Request): string | null => {
  if (req?.cookies?.refresh_token) {
    return req.cookies.refresh_token;
  }
  return null;
};

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshJwtPayload) {
    const rawToken = req.cookies?.refresh_token;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    return {
      sub: payload.sub,
      sessionId: payload.sessionId,
      refreshTokenId: payload.refreshTokenId,
      rawToken,
    };
  }
}
