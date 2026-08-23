// tokens/repositories/reset-token.repository.ts
import { Injectable } from '@nestjs/common';
import { ResetToken, TokenStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';

export interface CreateResetTokenData {
  userId: string;
  expiresIn?: number;
}

@Injectable()
export class ResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateResetTokenData): Promise<ResetToken> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + (data.expiresIn || 60 * 60 * 1000));

    await this.invalidateAllForUser(data.userId);

    return this.prisma.resetToken.create({
      data: {
        token,
        userId: data.userId,
        expiresAt,
        used: false,
        status: TokenStatus.PENDING,
      },
    });
  }

  async findByToken(token: string): Promise<ResetToken | null> {
    return this.prisma.resetToken.findUnique({
      where: { token },
    });
  }

  async findValidToken(token: string): Promise<ResetToken | null> {
    return this.prisma.resetToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
        status: TokenStatus.PENDING,
      },
    });
  }

  async markAsUsed(id: string): Promise<ResetToken> {
    return this.prisma.resetToken.update({
      where: { id },
      data: {
        used: true,
        status: TokenStatus.USED,
      },
    });
  }

  async invalidateAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.resetToken.updateMany({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        used: true,
        status: TokenStatus.EXPIRED,
      },
    });
    return result.count;
  }

  async isValid(token: string): Promise<boolean> {
    const count = await this.prisma.resetToken.count({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
        status: TokenStatus.PENDING,
      },
    });
    return count > 0;
  }

  async getUserIdByToken(token: string): Promise<string | null> {
    const resetToken = await this.prisma.resetToken.findUnique({
      where: { token },
      select: { userId: true },
    });
    return resetToken?.userId || null;
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.resetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
      },
    });
    return result.count;
  }

  async cleanupExpiredForUser(userId: string): Promise<number> {
    const result = await this.prisma.resetToken.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
      },
    });
    return result.count;
  }
}
