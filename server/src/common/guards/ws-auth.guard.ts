import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsJwtStrategy } from '../../auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';

// Guard WS générique — à appliquer sur toute gateway (@UseGuards(WsAuthGuard)).
// Peuple client.data.user avec la même forme que CurrentUser en HTTP, ce qui
// permet de partager les mêmes decorators et guards de rôles côté WS.
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly wsJwtStrategy: WsJwtStrategy,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    if (client.data?.user?.id) {
      return true;
    }

    const token = this.wsJwtStrategy.extractToken(client);

    if (!token) {
      throw new WsException('Token non fourni');
    }

    try {
      const user = await this.wsJwtStrategy.validateToken(token);
      client.data.user = user;

      await this.redisService
        .getClient()
        .sadd(`ws:presence:${user.id}`, client.id);
      await this.redisService
        .getClient()
        .expire(`ws:presence:${user.id}`, 86400);

      return true;
    } catch (error) {
      this.logger.warn(`Connexion WS refusée: ${(error as Error).message}`);
      throw new WsException('Token invalide');
    }
  }
}
