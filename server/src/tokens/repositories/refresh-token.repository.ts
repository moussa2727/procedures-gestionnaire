import { Injectable, Logger } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AUTH_CONSTANTS } from '@/config/auth.constants';

export interface IRefreshTokenValidation {
  findValidToken(token: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    isActive: boolean;
    rememberMe: boolean;
  } | null>;
  updateLastActivity(id: string): Promise<void>;
}
export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  isRememberMe?: boolean;
}

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenValidation {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { token: data.token },
    });

    if (existingToken) {
      await this.prisma.refreshToken.delete({
        where: { id: existingToken.id },
      });
      this.logger.warn('Token dupliqué supprimé');
    }

    const activeSessions = await this.countActiveForUser(data.userId);
    if (activeSessions >= AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS_PER_USER) {
      await this.removeOldestSession(data.userId);
    }

    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        isActive: true,
        rememberMe: data.isRememberMe ?? false,
        rotationCount: 0,
        lastActivity: new Date(),
      },
    });
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  async findValidToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActiveBySessionId(sessionId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        sessionId,
        isActive: true,
      },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async deactivateAllForSession(sessionId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { sessionId, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }

  async deactivateAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }

  async deactivateAllExceptUser(excludeUserId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId: { not: excludeUserId }, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }

  async rotateToken(
    oldTokenId: string,
    newToken: string,
    newExpiresAt: Date,
  ): Promise<RefreshToken> {
    return this.prisma.$transaction(async (tx) => {
      const oldToken = await tx.refreshToken.findUnique({
        where: { id: oldTokenId },
      });

      if (!oldToken) {
        throw new Error('Token introuvable');
      }

      if (oldToken.rotationCount >= AUTH_CONSTANTS.MAX_REFRESH_TOKEN_ROTATION) {
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: { isActive: false },
        });
        throw new Error('Nombre maximum de rotations atteint');
      }

      const sessionAgeMs = Date.now() - oldToken.createdAt.getTime();
      if (sessionAgeMs >= AUTH_CONSTANTS.SESSION_MAX_DURATION_MS) {
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: { isActive: false },
        });
        throw new Error(
          'Durée maximale de session atteinte, veuillez vous reconnecter',
        );
      }

      await tx.refreshToken.update({
        where: { id: oldTokenId },
        data: { isActive: false },
      });

      return tx.refreshToken.create({
        data: {
          userId: oldToken.userId,
          token: newToken,
          expiresAt: newExpiresAt,
          isActive: true,
          rememberMe: oldToken.rememberMe,
          rotationCount: oldToken.rotationCount + 1,
          lastActivity: new Date(),
          sessionId: oldToken.sessionId,
        },
      });
    });
  }

  async countActiveForUser(userId: string): Promise<number> {
    return this.prisma.refreshToken.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async removeOldestSession(userId: string): Promise<void> {
    const oldestSession = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (oldestSession) {
      await this.deactivate(oldestSession.id);
      const maskedUserId = this.maskId(oldestSession.id);
      this.logger.log(
        `Session la plus ancienne supprimée pour l'utilisateur ${maskedUserId}`,
      );
    }
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { lastActivity: new Date() },
    });
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });
    this.logger.log(`${result.count} tokens expirés nettoyés`);
    return result.count;
  }

  async cleanupInactiveSessions(inactivityLimit: Date): Promise<number> {
    const inactiveResult = await this.prisma.refreshToken.updateMany({
      where: {
        lastActivity: { lt: inactivityLimit },
        isActive: true,
        rememberMe: false,
      },
      data: { isActive: false },
    });

    const sessionMaxAgeLimit = new Date(
      Date.now() - AUTH_CONSTANTS.SESSION_MAX_DURATION_MS,
    );
    const maxAgeResult = await this.prisma.refreshToken.updateMany({
      where: {
        createdAt: { lt: sessionMaxAgeLimit },
        isActive: true,
      },
      data: { isActive: false },
    });

    const total = inactiveResult.count + maxAgeResult.count;
    if (total > 0) {
      this.logger.log(`${total} sessions inactives nettoyées`);
    }
    return total;
  }

  async hardDeleteDeactivatedTokens(olderThan: Date): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        isActive: false,
        updatedAt: { lt: olderThan },
      },
    });
    return result.count;
  }

  private maskId(id: string | number): string {
    if (!id) return '***';
    const strId = String(id);
    if (strId.length <= 8) {
      return '***';
    }
    return `${strId.substring(0, 3)}...${strId.substring(strId.length - 3)}`;
  }
}
