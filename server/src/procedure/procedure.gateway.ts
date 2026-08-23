// procedure/procedure.gateway.ts
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UserRole, Procedure, Step } from '@prisma/client';
import { WsJwtStrategy } from '@/auth/strategies/ws-jwt.strategy';
import { RedisService } from '@/redis/redis.service';
import {
  BaseGateway,
  type AuthenticatedSocket,
} from '@/websocket/base.gateway';

@WebSocketGateway({
  namespace: 'procedure',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
  transports: ['websocket', 'polling'],
})
export class ProcedureGateway
  extends BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly adminRoom = 'admin:procedure';

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

      this.logger.log(`Client procedure connecté: ${client.id}`);
    } catch (error) {
      this.logger.warn(
        `Connexion procedure refusée (${client.id}): ${(error as Error).message}`,
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
    this.logger.log(`Client procedure déconnecté: ${client.id}`);
  }

  // ==================== NOTIFICATIONS ====================

  notifyProcedureCreated(procedure: Procedure): void {
    this.emitToUser(procedure.studentId, 'procedure:created', procedure);
    this.emitToUser(procedure.consultantId, 'procedure:created', procedure);
    this.emitToRoom(this.adminRoom, 'admin:procedure:created', procedure);
    this.logger.debug(
      `Procedure created broadcast: ${procedure.numeroDossier}`,
    );
  }

  notifyStepUpdated(procedure: Procedure, step: Step): void {
    const payload = { procedure, step };
    this.emitToUser(procedure.studentId, 'procedure:step-updated', payload);
    this.emitToUser(procedure.consultantId, 'procedure:step-updated', payload);
    this.emitToRoom(this.adminRoom, 'admin:procedure:step-updated', payload);
    this.logger.debug(
      `Step updated broadcast: ${step.id} (${procedure.numeroDossier})`,
    );
  }

  notifyStepsCascadedRejection(
    procedure: Procedure,
    cascadedStepIds: string[],
  ): void {
    const payload = { procedureId: procedure.id, cascadedStepIds };
    this.emitToUser(
      procedure.studentId,
      'procedure:steps-cascaded-rejection',
      payload,
    );
    this.emitToUser(
      procedure.consultantId,
      'procedure:steps-cascaded-rejection',
      payload,
    );
    this.emitToRoom(
      this.adminRoom,
      'admin:procedure:steps-cascaded-rejection',
      payload,
    );
    this.logger.debug(
      `Cascaded rejection broadcast: ${cascadedStepIds.length} steps (${procedure.numeroDossier})`,
    );
  }

  notifyProcedureCompleted(procedure: Procedure): void {
    this.emitToUser(procedure.studentId, 'procedure:completed', procedure);
    this.emitToUser(procedure.consultantId, 'procedure:completed', procedure);
    this.emitToRoom(this.adminRoom, 'admin:procedure:completed', procedure);
    this.logger.debug(
      `Procedure completed broadcast: ${procedure.numeroDossier}`,
    );
  }

  notifyProcedureRejected(procedure: Procedure): void {
    this.emitToUser(procedure.studentId, 'procedure:rejected', procedure);
    this.emitToUser(procedure.consultantId, 'procedure:rejected', procedure);
    this.emitToRoom(this.adminRoom, 'admin:procedure:rejected', procedure);
    this.logger.debug(
      `Procedure rejected broadcast: ${procedure.numeroDossier}`,
    );
  }

  notifyProcedureCancelled(procedure: Procedure): void {
    this.emitToUser(procedure.studentId, 'procedure:cancelled', procedure);
    this.emitToUser(procedure.consultantId, 'procedure:cancelled', procedure);
    this.emitToRoom(this.adminRoom, 'admin:procedure:cancelled', procedure);
    this.logger.debug(
      `Procedure cancelled broadcast: ${procedure.numeroDossier}`,
    );
  }
}
