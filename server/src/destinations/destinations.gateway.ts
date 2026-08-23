import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';
import { DestinationResponseDto } from './dto/destination-response.dto';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';

@WebSocketGateway({
  namespace: 'destinations',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class DestinationGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly adminRoom = 'admin:destinations';

  constructor(
    private readonly wsJwtStrategy: WsJwtStrategy,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    this.logger.log(`Client tentant de se connecter: ${client.id}`);

    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connexion refusée: token non fourni - ${client.id}`);
        client.disconnect();
        return;
      }

      const user = await this.wsJwtStrategy.validateToken(token);
      if (!user?.id) {
        this.logger.warn(`Connexion refusée: token invalide - ${client.id}`);
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
        this.logger.log('Admin a rejoint la salle admin destinations');
      }

      client.emit('connection:established', {
        timestamp: new Date().toISOString(),
        events: this.getAvailableEvents(),
      });

      this.logger.log(`Destination client connecté: ${client.id}`);
    } catch (error) {
      this.logger.warn(
        `Connexion destinations refusée (${client.id}): ${(error as Error).message}`,
      );
      client.emit('error', { message: "Erreur d'authentification" });
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
    this.logger.log(`Destination client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('ping')
  @UseGuards(WsAuthGuard)
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('admin:join')
  @UseGuards(WsAuthGuard)
  async handleAdminJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const user = this.getClientUser(client);
    if (user?.role === UserRole.ADMIN) {
      await this.joinRoom(client, this.adminRoom);
      client.emit('admin:joined', {
        success: true,
        message: 'Connecté au canal administrateur des destinations',
        timestamp: new Date().toISOString(),
      });
      this.logger.log('Admin a rejoint la salle admin destinations');
    } else {
      client.emit('error', {
        message: 'Accès non autorisé — privilèges administrateur requis',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('admin:leave')
  @UseGuards(WsAuthGuard)
  async handleAdminLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    await this.leaveRoom(client, this.adminRoom);
    client.emit('admin:left', {
      success: true,
      message: 'Vous avez quitté le canal administrateur des destinations',
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== BROADCAST ====================

  broadcastDestinationCreated(destination: DestinationResponseDto): void {
    this.logger.log(`Broadcast destination créée: ${destination.country}`);
    this.emitToNamespace('destination:created', destination);
    this.emitToRoom(this.adminRoom, 'admin:destination:created', destination);
  }

  broadcastDestinationUpdated(destination: DestinationResponseDto): void {
    this.logger.log(
      `Broadcast destination mise à jour: ${destination.country}`,
    );
    this.emitToNamespace('destination:updated', destination);
    this.emitToRoom(this.adminRoom, 'admin:destination:updated', destination);
  }

  broadcastDestinationDeleted(id: string): void {
    this.logger.log(`Broadcast destination supprimée: ${id}`);
    this.emitToNamespace('destination:deleted', id);
    this.emitToRoom(this.adminRoom, 'admin:destination:deleted', id);
  }

  // ==================== METHODES PUBLIQUES POUR LES CONTROLLERS ====================

  notifyDestinationCreated(destination: DestinationResponseDto): void {
    this.broadcastDestinationCreated(destination);
  }

  notifyDestinationUpdated(destination: DestinationResponseDto): void {
    this.broadcastDestinationUpdated(destination);
  }

  notifyDestinationDeleted(id: string): void {
    this.broadcastDestinationDeleted(id);
  }

  private getAvailableEvents(): string[] {
    return [
      'destination:created',
      'destination:updated',
      'destination:deleted',
      'admin:joined',
      'admin:left',
      'connection:established',
      'error',
      'pong',
    ];
  }
}
