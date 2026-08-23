import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ConsultantUnavailability, UserRole } from '@prisma/client';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';

// Diffuse la création/suppression d'une absence — utile côté frontend
// pour rafraîchir en temps réel un calendrier de disponibilité déjà
// affiché (ex: un étudiant en train de choisir un créneau voit
// disparaître une journée qui vient d'être bloquée par le consultant).
@WebSocketGateway({
  namespace: '/consultant-unavailability',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  transports: ['websocket', 'polling'],
})
export class ConsultantUnavailabilityGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly adminRoom = 'admin:consultant-unavailability';

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

      await this.redisService
        .getClient()
        .sadd(`ws:presence:${user.id}`, client.id);
      await this.redisService
        .getClient()
        .expire(`ws:presence:${user.id}`, 86400);

      if (user.role === UserRole.ADMIN) {
        await this.joinRoom(client, this.adminRoom);
      }
    } catch (error) {
      this.logger.warn(
        `Connexion consultant-unavailability refusée (${client.id}): ${(error as Error).message}`,
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

  notifyAbsenceCreated(
    consultantId: string,
    absence: ConsultantUnavailability,
  ): void {
    this.emitToNamespace('unavailability:created', { consultantId, absence });
    this.emitToRoom(this.adminRoom, 'admin:unavailability:created', {
      consultantId,
      absence,
    });
  }

  notifyAbsenceDeleted(consultantId: string, absenceId: string): void {
    this.emitToNamespace('unavailability:deleted', { consultantId, absenceId });
    this.emitToRoom(this.adminRoom, 'admin:unavailability:deleted', {
      consultantId,
      absenceId,
    });
  }
}
