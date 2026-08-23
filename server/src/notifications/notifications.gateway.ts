// notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';
import { Notification } from '@prisma/client';

@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class NotificationsGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  declare server: Server;

  constructor(private readonly wsJwtStrategy: WsJwtStrategy) {
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
    } catch (error) {
      this.logger.warn(
        `Connexion notifications refusee (${client.id}): ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(): void {
    // Aucun etat a nettoyer cote serveur — la room quitte automatiquement
    // a la deconnexion du socket.
  }

  push(notification: Notification): void {
    this.emitToUser(notification.userId, 'notification:new', notification);
  }

  pushUnreadCount(userId: string, count: number): void {
    this.emitToUser(userId, 'notification:unread-count', { count });
  }

  // Methode publique pour emettre un evenement vers un utilisateur specifique
  // Surcharge de la methode protegee de BaseGateway pour la rendre publique
  public emitToUser(userId: string, event: string, data: any): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
