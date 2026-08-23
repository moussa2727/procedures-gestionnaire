// users/users.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { UsersQueueService } from './jobs/users-queue.service';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';
import { RedisService } from '@/redis/redis.service';

export interface UserStatusPayload {
  userId: string;
  isOnline: boolean;
  socketCount?: number;
}

@WebSocketGateway({
  namespace: 'users',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class UsersGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  declare server: Server;

  private readonly gatewayLogger = new Logger(UsersGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  // TTL pour la présence Redis (24h - cohérent avec handleConnection)
  private readonly PRESENCE_TTL = 86400; // 24 heures

  constructor(
    private readonly wsJwtStrategy: WsJwtStrategy,
    private readonly usersQueueService: UsersQueueService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.gatewayLogger.warn(
          `Connexion refusée: token non fourni - ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const user = await this.wsJwtStrategy.validateToken(token);
      if (!user?.id) {
        this.gatewayLogger.warn(
          `Connexion refusée: utilisateur non authentifié - ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Stocker l'utilisateur sur le socket
      this.setClientUser(client, user);

      // Rejoindre la room utilisateur
      await this.joinRoom(client, `user:${user.id}`);

      // Enregistrer le socket
      this.registerUserSockets(user.id, client.id);

      // Mettre à jour la présence Redis
      await this.updatePresenceInRedis(user.id, client.id);

      // Vérifier si c'était déjà en ligne avant la connexion
      const wasOnline = this.isUserOnline(user.id);

      // Mettre à jour le statut uniquement si c'était false
      if (!wasOnline) {
        await this.usersQueueService.updateOnlineStatus({
          userId: user.id,
          isOnline: true,
          socketCount: this.userSockets.get(user.id)?.size ?? 0,
        });
      } else {
        // Mettre à jour le compteur de sockets même si déjà en ligne
        await this.usersQueueService.updateOnlineStatus({
          userId: user.id,
          isOnline: true,
          socketCount: this.userSockets.get(user.id)?.size ?? 0,
        });
      }

      // Émettre l'identification
      client.emit('identified', {
        userId: user.id,
        socketId: client.id,
        socketCount: this.userSockets.get(user.id)?.size ?? 0,
      });

      // Notifier les autres clients du nouveau socket (optionnel)
      this.emitToUser(user.id, 'presence:updated', {
        userId: user.id,
        socketCount: this.userSockets.get(user.id)?.size ?? 0,
        timestamp: new Date().toISOString(),
      });

      this.gatewayLogger.debug(
        `Client connecté: ${client.id} (${user.id}) - ${this.userSockets.get(user.id)?.size ?? 0} socket(s)`,
      );
    } catch (error) {
      this.gatewayLogger.warn(
        `Connexion users refusée (${client.id}): ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const user = this.getClientUser(client);
    if (!user) {
      this.gatewayLogger.debug(
        `Déconnexion sans utilisateur associé: ${client.id}`,
      );
      return;
    }

    // Supprimer le socket de la présence Redis
    await this.removePresenceFromRedis(user.id, client.id);

    // Supprimer le socket de la Map
    this.unregisterUserSockets(user.id, client.id);

    // Vérifier s'il reste des sockets actifs
    const remainingSockets = this.userSockets.get(user.id)?.size ?? 0;

    if (remainingSockets === 0) {
      // Plus aucun socket actif → l'utilisateur est hors ligne
      this.userSockets.delete(user.id);

      await this.usersQueueService.updateOnlineStatus({
        userId: user.id,
        isOnline: false,
        socketCount: 0,
      });

      // Notifier les autres clients (optionnel)
      this.emitToUser(user.id, 'presence:updated', {
        userId: user.id,
        isOnline: false,
        socketCount: 0,
        timestamp: new Date().toISOString(),
      });

      this.gatewayLogger.debug(`Utilisateur hors ligne: ${user.id}`);
    } else {
      // Il reste des sockets → l'utilisateur reste en ligne
      this.gatewayLogger.debug(
        `Socket déconnecté pour ${user.id} - ${remainingSockets} socket(s) restant(s)`,
      );

      // Notifier du changement de nombre de sockets
      this.emitToUser(user.id, 'presence:updated', {
        userId: user.id,
        isOnline: true,
        socketCount: remainingSockets,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
    const user = this.getClientUser(client);
    client.emit('pong', {
      timestamp: Date.now(),
      userId: user?.id,
      socketId: client.id,
    });
  }

  @SubscribeMessage('presence:check')
  async handlePresenceCheck(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const user = this.getClientUser(client);
    if (!user) return;

    const socketCount = this.userSockets.get(user.id)?.size ?? 0;
    client.emit('presence:status', {
      userId: user.id,
      isOnline: socketCount > 0,
      socketCount,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== MÉTHODES DE NOTIFICATION ====================

  notifyUserStatus(
    userId: string,
    isOnline: boolean,
    socketCount?: number,
  ): void {
    const payload: UserStatusPayload = {
      userId,
      isOnline,
      socketCount: socketCount ?? 0,
    };
    this.emitToUser(userId, 'status', payload);
  }

  notifyUserUpdated(userId: string, data: Record<string, unknown>): void {
    this.emitToUser(userId, 'userUpdated', { userId, data });
  }

  notifyNewReview(
    consultantId: string,
    review: {
      id: string;
      rating: number;
      comment?: string;
      studentName: string;
      createdAt: Date;
    },
  ): void {
    this.emitToUser(consultantId, 'newReview', review);
  }

  notifyReviewResponse(
    reviewId: string,
    response: { response: string; createdAt: Date },
  ): void {
    this.emitToNamespace('reviewResponse', { reviewId, ...response });
  }

  // ==================== MÉTHODES DE GESTION DES SOCKETS ====================

  private registerUserSockets(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private unregisterUserSockets(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    }
  }

  isUserOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  getSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }

  // ==================== PRÉSENCE REDIS ====================

  private async updatePresenceInRedis(
    userId: string,
    socketId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const presenceKey = `ws:presence:${userId}`;

    await client.sadd(presenceKey, socketId);
    await client.expire(presenceKey, this.PRESENCE_TTL);

    this.gatewayLogger.debug(
      `Présence Redis mise à jour pour ${userId} (socket ${socketId})`,
    );
  }

  private async removePresenceFromRedis(
    userId: string,
    socketId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const presenceKey = `ws:presence:${userId}`;

    await client.srem(presenceKey, socketId);

    // Vérifier s'il reste des sockets dans Redis
    const remaining = await client.scard(presenceKey);
    if (remaining === 0) {
      // Supprimer la clé si plus de sockets
      await client.del(presenceKey);
      this.gatewayLogger.debug(`Clé présence Redis supprimée pour ${userId}`);
    } else {
      // Prolonger le TTL si des sockets restent
      await client.expire(presenceKey, this.PRESENCE_TTL);
      this.gatewayLogger.debug(
        `Présence Redis maintenue pour ${userId} (${remaining} socket(s) restant(s))`,
      );
    }
  }

  // Récupérer le nombre de sockets actifs depuis Redis (pour réconciliation)
  async getPresenceCountFromRedis(userId: string): Promise<number> {
    const client = this.redisService.getClient();
    const presenceKey = `ws:presence:${userId}`;
    return client.scard(presenceKey);
  }
}
