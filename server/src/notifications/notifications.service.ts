import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationInput } from './interfaces/notifications.interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    this.gateway.push(notification);
    await this.pushUnreadCount(input.userId);

    return notification;
  }

  async createWithinTransaction(
    tx: Prisma.TransactionClient,
    input: CreateNotificationInput,
  ) {
    return tx.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async pushPostCommit(notification: {
    id: string;
    userId: string;
  }): Promise<void> {
    const full = await this.prisma.notification.findUnique({
      where: { id: notification.id },
    });
    if (!full) return;

    this.gateway.push(full);
    await this.pushUnreadCount(notification.userId);
  }

  async findForUser(userId: string, page = 1, limit = 20) {
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification #${id} introuvable`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cette notification ne vous appartient pas');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    await this.pushUnreadCount(userId);

    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    await this.pushUnreadCount(userId);

    return { updatedCount: result.count };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  private async pushUnreadCount(userId: string): Promise<void> {
    const count = await this.getUnreadCount(userId);
    this.gateway.pushUnreadCount(userId, count);
  }
}
