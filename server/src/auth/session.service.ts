// auth/session.service.ts
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RevocationReason, Session } from '@prisma/client';
import { RedisService } from '@/redis/redis.service';
import { AUTH_CONSTANTS } from '@/config/auth.constants';

export interface CreateSessionData {
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly CLEANUP_LOCK_KEY = 'session:cleanup:lock';
  private readonly CLEANUP_LOCK_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(
    data: CreateSessionData,
    token: string,
    expiresAt: Date,
  ): Promise<Session> {
    const activeCount = await this.prisma.session.count({
      where: {
        userId: data.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeCount >= AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS_PER_USER) {
      this.logger.warn(
        `Creation de session refusee pour ${this.maskId(data.userId)} : plafond de ${AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS_PER_USER} sessions atteint`,
      );
      throw new ForbiddenException(
        `Nombre maximum de sessions actives atteint (${AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS_PER_USER}). Deconnectez-vous d'un autre appareil avant de continuer.`,
      );
    }

    const session = await this.prisma.session.create({
      data: {
        userId: data.userId,
        token,
        expiresAt,
        isActive: true,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    console.log('SESSION SERVICE create:', {
      sessionId: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });

    const cacheKey = `session:${session.id}`;
    await this.redisService
      .getClient()
      .set(cacheKey, JSON.stringify(session), 'EX', 3600);

    return session;
  }

  async findActiveById(id: string): Promise<Session | null> {
    const cacheKey = `session:${id}`;
    const client = this.redisService.getClient();

    try {
      const cached = await client.get(cacheKey);

      if (cached === 'inactive') {
        return null;
      }

      if (cached) {
        const parsed = JSON.parse(cached) as Session;
        if (parsed.isActive && new Date(parsed.expiresAt) > new Date()) {
          return parsed;
        }
        await client.set(cacheKey, 'inactive', 'EX', 300);
        return null;
      }
    } catch {
      this.logger.debug(
        `Erreur de cache Redis pour session ${this.maskId(id)}, fallback DB`,
      );
    }

    const session = await this.prisma.session.findFirst({
      where: { id, isActive: true, expiresAt: { gt: new Date() } },
    });

    if (session) {
      await client.set(cacheKey, JSON.stringify(session), 'EX', 3600);
    } else {
      await client.set(cacheKey, 'inactive', 'EX', 300);
    }

    return session;
  }

  async deactivate(id: string, reason: RevocationReason): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });

    await this.redisService
      .getClient()
      .set(`session:${id}`, 'inactive', 'EX', 3600);
  }

  async deactivateAllForUser(
    userId: string,
    reason: RevocationReason,
  ): Promise<number> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isActive: true },
      select: { id: true },
    });

    const result = await this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        revocationReason: reason,
      },
    });

    if (sessions.length > 0) {
      const pipeline = this.redisService.getClient().pipeline();
      for (const session of sessions) {
        pipeline.set(`session:${session.id}`, 'inactive', 'EX', 3600);
      }
      await pipeline.exec();
    }

    return result.count;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cleanupExpired(): Promise<number> {
    const client = this.redisService.getClient();

    const acquired = await client.set(
      this.CLEANUP_LOCK_KEY,
      Date.now().toString(),
      'EX',
      this.CLEANUP_LOCK_TTL,
      'NX',
    );

    if (acquired !== 'OK') {
      this.logger.debug('Nettoyage des sessions déjà en cours, ignoré');
      return 0;
    }

    try {
      const result = await this.prisma.session.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true,
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          revocationReason: RevocationReason.SESSION_EXPIRED,
        },
      });

      if (result.count > 0) {
        this.logger.log(`${result.count} sessions expirées désactivées`);
      }

      return result.count;
    } catch (error) {
      this.logger.error(
        `Erreur lors du nettoyage des sessions: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      await client.del(this.CLEANUP_LOCK_KEY);
    }
  }

  private maskId(id: string): string {
    if (id.length <= 8) return '***';
    return `${id.substring(0, 3)}...${id.substring(id.length - 3)}`;
  }
}
