import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@/common/interfaces/current-user.interface';
import { RevokedTokenRepository } from '@/tokens/repositories/revoked-token.repository';
import { SessionService } from '../session.service';
import { RedisService } from '@/redis/redis.service';

const cookieExtractor = (req: Request): string | null => {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly sessionService: SessionService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<CurrentUser> {
    const rawToken = ExtractJwt.fromExtractors([
      cookieExtractor,
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ])(req);

    if (rawToken) {
      try {
        const blacklisted = await this.redisService
          .getClient()
          .get(`blacklist:access:${rawToken}`);

        if (blacklisted) {
          throw new UnauthorizedException('Token revoque');
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
      }

      try {
        const revokedInDb =
          await this.revokedTokenRepository.isRevoked(rawToken);
        if (revokedInDb) {
          throw new UnauthorizedException('Token revoque');
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
      }
    }

    const session = await this.sessionService.findActiveById(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expiree ou revoquee');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }
}
