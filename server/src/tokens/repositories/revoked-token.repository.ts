import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RevokedToken } from '@prisma/client';

export interface RevokeTokenData {
  token: string;
  userId: string;
  reason?: string;
}

@Injectable()
export class RevokedTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async revoke(data: RevokeTokenData): Promise<RevokedToken> {
    return this.prisma.revokedToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        reason: data.reason,
      },
    });
  }

  async isRevoked(token: string): Promise<boolean> {
    const count = await this.prisma.revokedToken.count({
      where: { token },
    });
    return count > 0;
  }

  async findByToken(token: string): Promise<RevokedToken | null> {
    return this.prisma.revokedToken.findUnique({
      where: { token },
    });
  }

  async remove(token: string): Promise<RevokedToken | null> {
    try {
      return await this.prisma.revokedToken.delete({
        where: { token },
      });
    } catch {
      return null;
    }
  }

  async cleanupExpired(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.revokedToken.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    return result.count;
  }

  async findAllForUser(userId: string): Promise<RevokedToken[]> {
    return this.prisma.revokedToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countForUser(userId: string): Promise<number> {
    return this.prisma.revokedToken.count({
      where: { userId },
    });
  }

  // Purge les entrées d'un utilisateur plus anciennes que olderThanDays,
  // au lieu de tout supprimer sans condition d'âge.
  async cleanupExpiredForUser(
    userId: string,
    olderThanDays: number = 30,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.revokedToken.deleteMany({
      where: { userId, createdAt: { lt: cutoffDate } },
    });
    return result.count;
  }

  async revokeAllForUser(
    userId: string,
    tokens: string[],
    reason?: string,
  ): Promise<number> {
    const data = tokens.map((token) => ({
      token,
      userId,
      reason,
    }));

    const result = await this.prisma.revokedToken.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }
}
