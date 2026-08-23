// rendez-vous/rendez-vous.gateway.ts
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UserRole, RendezVous } from '@prisma/client';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';

@WebSocketGateway({
  namespace: 'rendez-vous',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  transports: ['websocket', 'polling'],
})
export class RendezVousGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly adminRoom = 'admin:rendez-vous';

  constructor(
    private readonly wsJwtStrategy: WsJwtStrategy,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const user = await this.wsJwtStrategy.validateToken(token);
      if (!user?.id) {
        client.disconnect();
        return;
      }

      this.setClientUser(client, user);
      await this.joinRoom(client, `user:${user.id}`);

      await this.redisService
        .getClient()
        .sadd(`ws:presence:${user.id}`, client.id);
      await this.redisService
        .getClient()
        .expire(`ws:presence:${user.id}`, 86400);

      if (user.role === UserRole.ADMIN) {
        await this.joinRoom(client, this.adminRoom);
      }

      this.logger.log(`Client rendez-vous connecté: ${client.id}`);
    } catch (error) {
      this.logger.warn(
        `Connexion rendez-vous refusée (${client.id}): ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const user = this.getClientUser(client);
    if (user?.id) {
      await this.redisService
        .getClient()
        .srem(`ws:presence:${user.id}`, client.id);
    }
  }

  notifyRendezVousCreated(rendezVous: RendezVous): void {
    this.emitToUser(rendezVous.studentId, 'rendez-vous:created', rendezVous);
    this.emitToUser(rendezVous.consultantId, 'rendez-vous:created', rendezVous);
    this.emitToRoom(this.adminRoom, 'admin:rendez-vous:created', rendezVous);
  }

  notifyRendezVousRescheduled(rendezVous: RendezVous): void {
    this.emitToUser(
      rendezVous.studentId,
      'rendez-vous:rescheduled',
      rendezVous,
    );
    this.emitToUser(
      rendezVous.consultantId,
      'rendez-vous:rescheduled',
      rendezVous,
    );
    this.emitToRoom(
      this.adminRoom,
      'admin:rendez-vous:rescheduled',
      rendezVous,
    );
  }

  notifyRendezVousCancelled(rendezVous: RendezVous): void {
    this.emitToUser(rendezVous.studentId, 'rendez-vous:cancelled', rendezVous);
    this.emitToUser(
      rendezVous.consultantId,
      'rendez-vous:cancelled',
      rendezVous,
    );
    this.emitToRoom(this.adminRoom, 'admin:rendez-vous:cancelled', rendezVous);
  }
}
