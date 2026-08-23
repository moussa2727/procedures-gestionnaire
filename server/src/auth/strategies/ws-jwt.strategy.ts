import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@/common/interfaces/current-user.interface';
import { RevokedTokenRepository } from '@/tokens/repositories/revoked-token.repository';
import { SessionService } from '../session.service';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class WsJwtStrategy {
  private readonly logger = new Logger(WsJwtStrategy.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly sessionService: SessionService,
    private readonly redisService: RedisService,
  ) {}

  extractToken(client: Socket): string | null {
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const match = cookies.match(/access_token=([^;]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  async validateToken(token: string): Promise<CurrentUser> {
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });

      const blacklisted = await this.redisService
        .getClient()
        .get(`blacklist:access:${token}`);

      if (blacklisted) {
        throw new Error('Token revoque');
      }

      const revokedInDb = await this.revokedTokenRepository.isRevoked(token);
      if (revokedInDb) {
        throw new Error('Token revoque');
      }

      const session = await this.sessionService.findActiveById(
        payload.sessionId,
      );
      if (!session) {
        throw new Error('Session expiree ou revoquee');
      }

      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId,
      };
    } catch (error) {
      this.logger.warn(
        `Echec de validation WebSocket: ${(error as Error).message}`,
      );
      throw new Error('Authentification WebSocket echouee');
    }
  }
}
