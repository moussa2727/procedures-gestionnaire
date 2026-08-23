// follow-up-meeting/follow-up-meeting.gateway.ts
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UserRole, FollowUpMeeting } from '@prisma/client';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';

@WebSocketGateway({
  namespace: 'follow-up-meeting',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  transports: ['websocket', 'polling'],
})
export class FollowUpMeetingGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly adminRoom = 'admin:follow-up-meeting';

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
    } catch (error) {
      this.logger.warn(
        `Connexion follow-up-meeting refusée (${client.id}): ${(error as Error).message}`,
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

  notifyCreated(meeting: FollowUpMeeting): void {
    this.emitToUser(meeting.studentId, 'follow-up-meeting:created', meeting);
    this.emitToUser(meeting.consultantId, 'follow-up-meeting:created', meeting);
    this.emitToRoom(this.adminRoom, 'admin:follow-up-meeting:created', meeting);
  }

  notifyRescheduled(meeting: FollowUpMeeting): void {
    this.emitToUser(
      meeting.studentId,
      'follow-up-meeting:rescheduled',
      meeting,
    );
    this.emitToUser(
      meeting.consultantId,
      'follow-up-meeting:rescheduled',
      meeting,
    );
    this.emitToRoom(
      this.adminRoom,
      'admin:follow-up-meeting:rescheduled',
      meeting,
    );
  }

  notifyCancelled(meeting: FollowUpMeeting): void {
    this.emitToUser(meeting.studentId, 'follow-up-meeting:cancelled', meeting);
    this.emitToUser(
      meeting.consultantId,
      'follow-up-meeting:cancelled',
      meeting,
    );
    this.emitToRoom(
      this.adminRoom,
      'admin:follow-up-meeting:cancelled',
      meeting,
    );
  }

  notifyCompleted(meeting: FollowUpMeeting): void {
    this.emitToUser(meeting.studentId, 'follow-up-meeting:completed', meeting);
    this.emitToUser(
      meeting.consultantId,
      'follow-up-meeting:completed',
      meeting,
    );
    this.emitToRoom(
      this.adminRoom,
      'admin:follow-up-meeting:completed',
      meeting,
    );
  }
}
