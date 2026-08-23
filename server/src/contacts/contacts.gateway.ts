// modules/contacts/contacts.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';
import { Contact, UserRole } from '@prisma/client';

@Injectable()
@WebSocketGateway({
  namespace: 'admin/contacts',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class ContactsGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly adminRoom = 'admin:contacts';

  constructor(
    private readonly wsJwtStrategy: WsJwtStrategy,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.wsJwtStrategy.extractToken(client);
      if (!token) {
        this.logger.warn(`Connexion refusee: token non fourni - ${client.id}`);
        client.disconnect();
        return;
      }

      const user = await this.wsJwtStrategy.validateToken(token);
      if (!user?.id || user.role !== UserRole.ADMIN) {
        this.logger.warn(
          `Connexion refusee: utilisateur non authentifie ou non-admin - ${client.id}`,
        );
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
      await this.joinRoom(client, this.adminRoom);
      this.logger.log(`Admin ${user.email} connecte a la salle contacts`);

      client.emit('connection:established', {
        timestamp: new Date().toISOString(),
        events: this.getAvailableEvents(),
      });

      this.logger.log(`Client connecte: ${client.id} (${user.email})`);
    } catch (error) {
      this.logger.warn(
        `Connexion refusee (${client.id}): ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client deconnecte: ${client.id}`);
  }

  @SubscribeMessage('admin:join')
  async handleAdminJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const user = this.getClientUser(client);
    if (user?.role === UserRole.ADMIN) {
      await this.joinRoom(client, this.adminRoom);
      client.emit('admin:joined', {
        success: true,
        message: 'Connecte au canal administrateur des contacts',
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`Admin ${user.email} a rejoint la salle admin`);
    } else {
      client.emit('error', {
        message: 'Acces non autorise - privileges administrateur requis',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('admin:leave')
  async handleAdminLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    await this.leaveRoom(client, this.adminRoom);
    client.emit('admin:left', {
      success: true,
      message: 'Vous avez quitte le canal administrateur',
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Admin ${this.getClientUser(client)?.email} a quitte la salle admin`,
    );
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      clientId: client.id,
    });
  }

  emitNewMessage(contact: Contact) {
    this.emitToNamespace('contact:new', contact);
    this.emitToRoom(this.adminRoom, 'admin:contact:new', contact);
    this.logger.log(`Nouveau contact broadcast - ID: ${contact.id}`);
  }

  emitMessageUpdated(
    contact: Contact,
    action: 'read' | 'replied' | 'archived' | 'unarchived',
  ) {
    const payload = { contact, action };
    this.emitToNamespace('contact:updated', payload);
    this.emitToRoom(this.adminRoom, 'admin:contact:updated', payload);
    this.logger.log(
      `Contact mis a jour broadcast - ID: ${contact.id}, action: ${action}`,
    );
  }

  emitMessageDeleted(contactId: string) {
    this.emitToNamespace('contact:deleted', { id: contactId });
    this.emitToRoom(this.adminRoom, 'admin:contact:deleted', { id: contactId });
    this.logger.log(`Contact supprime broadcast - ID: ${contactId}`);
  }

  private getAvailableEvents(): string[] {
    return [
      'contact:new',
      'contact:updated',
      'contact:deleted',
      'admin:contact:new',
      'admin:contact:updated',
      'admin:contact:deleted',
      'admin:joined',
      'admin:left',
      'connection:established',
      'error',
      'pong',
    ];
  }
}
