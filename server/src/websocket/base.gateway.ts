import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & {
    user?: {
      id: string;
      email: string;
      role: string;
      sessionId?: string;
    };
  };
}

/**
 * Base commune à tous les gateways du projet.
 * Les gateways dérivés peuvent réutiliser les helpers communs pour l'auth
 * WebSocket, les salles, la diffusion et la gestion des utilisateurs.
 */
export abstract class BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  protected server!: Server;

  protected readonly logger = new Logger(this.constructor.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté : ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`);
  }

  protected getClientUser(client: AuthenticatedSocket) {
    return client.data?.user;
  }

  protected setClientUser(
    client: AuthenticatedSocket,
    user: NonNullable<AuthenticatedSocket['data']['user']>,
  ) {
    client.data.user = user;
  }

  protected extractToken(client: AuthenticatedSocket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const token = client.handshake.auth?.token;
    if (typeof token === 'string' && token.length > 0) {
      return token;
    }

    const cookies = client.handshake.headers.cookie;
    const match = cookies?.match(/access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  protected emitToNamespace(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }

  protected emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  protected emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  protected async joinRoom(client: AuthenticatedSocket, room: string) {
    await client.join(room);
  }

  protected async leaveRoom(client: AuthenticatedSocket, room: string) {
    await client.leave(room);
  }
}
