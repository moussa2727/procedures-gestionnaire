// modules/contacts/contacts.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { ContactsGateway } from './contacts.gateway';
import { SpamDetectionService } from './spam-detection.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';
import { BulkOperationDto } from './dto/bulk-operation.dto';
import {
  CONTACT_RECONCILIATION_QUEUE,
  RECONCILE_CREATE_JOB,
  RECONCILE_REPLY_JOB,
  RECONCILIATION_ATTEMPTS,
  RECONCILIATION_BACKOFF_MS,
} from './jobs/contact-reconciliation.constants';
import { AuditAction, ContactStatus, Prisma, UserRole } from '@prisma/client';

export interface CachedContacts {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactStatistics {
  total: number;
  unread: number;
  replied: number;
  pending: number;
  archived: number;
  responseRate: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  generatedAt: string;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  private readonly STATS_CACHE_KEY = 'contacts:statistics';
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueueService: EmailQueueService,
    private readonly redisService: RedisService,
    private readonly gateway: ContactsGateway,
    private readonly spamDetection: SpamDetectionService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(CONTACT_RECONCILIATION_QUEUE)
    private readonly reconciliationQueue: Queue,
  ) {}

  private get redis() {
    return this.redisService.getClient();
  }

  async create(dto: CreateContactDto, ipAddress: string) {
    if (this.spamDetection.isSpam(dto)) {
      this.logger.warn(`SPAM detecte depuis ${ipAddress}`);
      await this.prisma.auditLog.create({
        data: {
          userId: null,
          action: AuditAction.CREATE,
          entity: 'Contact',
          entityId: null,
          success: false,
          ipAddress,
          metadata: { reason: 'spam_detected', email: dto.email },
        },
      });
      return { success: true };
    }

    try {
      const contact = await this.prisma.contact.create({
        data: {
          name: dto.name ?? '',
          email: dto.email,
          message: dto.message,
          ipAddress,
          status: ContactStatus.NEW,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: null,
          action: AuditAction.CREATE,
          entity: 'Contact',
          entityId: contact.id,
          success: true,
          ipAddress,
          metadata: { email: dto.email },
        },
      });

      this.gateway.emitNewMessage(contact);
      await this.invalidateCaches();

      await this.sendConfirmationEmail(dto);
      await this.sendAdminNotification(contact.id, dto);

      try {
        const adminUsers = await this.prisma.user.findMany({
          where: { role: UserRole.ADMIN, isActive: true, isDeleted: false },
          select: { id: true },
        });

        for (const admin of adminUsers) {
          await this.notificationsService.create({
            userId: admin.id,
            type: 'CONTACT_NEW',
            title: 'Nouveau message de contact',
            message: `Nouveau message de ${dto.name || ''} (${dto.email})`,
            entity: 'Contact',
            entityId: contact.id,
          });
        }
      } catch (notifError) {
        this.logger.warn(
          `Erreur lors de la creation des notifications pour le contact ${contact.id}`,
          notifError,
        );
      }

      this.logger.log(`Contact cree: ${contact.id}`);
      return { success: true };
    } catch (error) {
      // Email masqué dans le log
      this.logger.error(
        `Ecriture BDD echouee pour ${this.maskEmail(dto.email)}, mise en reconciliation`,
        error,
      );

      await this.reconciliationQueue.add(
        RECONCILE_CREATE_JOB,
        {
          name: dto.name ?? '',
          email: dto.email,
          message: dto.message,
          ipAddress,
        },
        {
          attempts: RECONCILIATION_ATTEMPTS,
          backoff: { type: 'exponential', delay: RECONCILIATION_BACKOFF_MS },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return { success: true };
    }
  }

  private async sendConfirmationEmail(dto: CreateContactDto): Promise<void> {
    await this.emailQueueService.send({
      to: dto.email,
      subject: 'Confirmation de reception de votre message',
      template: 'contacts/contact-confirmation',
      context: {
        name: dto.name ?? '',
        message: dto.message,
      },
    });
  }

  private async sendAdminNotification(
    contactId: string,
    dto: CreateContactDto,
  ): Promise<void> {
    const adminEmail = process.env.EMAIL_FROM;
    if (!adminEmail) return;

    await this.emailQueueService.send({
      to: adminEmail,
      subject: `Nouveau message de contact - ${dto.name ?? ''}`,
      template: 'contacts/contact-notification-admin',
      context: {
        name: dto.name ?? '',
        email: dto.email,
        message: dto.message,
        contactId,
        adminUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        createdAt: new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    });
  }

  async findAll(filter: FilterContactDto) {
    const { search, status, page = 1, limit = 10 } = filter;

    const where: Prisma.ContactWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const cacheKey = `contacts:list:${page}:${limit}:${JSON.stringify(where)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug('Contacts servis depuis le cache');
      return JSON.parse(cached) as CachedContacts;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    const result: CachedContacts = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      this.CACHE_TTL,
    );

    return result;
  }

  async findOne(id: string) {
    const cacheKey = `contact:${id}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`Contact ${id} servis depuis le cache`);
      return JSON.parse(cached);
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });

    if (!contact) throw new NotFoundException('Message introuvable');

    await this.redis.set(
      cacheKey,
      JSON.stringify(contact),
      'EX',
      this.CACHE_TTL,
    );

    return contact;
  }

  async markAsRead(id: string, actorId: string) {
    const contact = await this.findOne(id);

    if (contact.status === ContactStatus.ARCHIVED) {
      throw new BadRequestException(
        'Impossible de marquer comme lu un message archive',
      );
    }

    if (contact.status === ContactStatus.REPLIED) {
      return contact;
    }

    if (contact.status === ContactStatus.READ) {
      return contact;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.contact.update({
        where: { id },
        data: { status: ContactStatus.READ },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.UPDATE,
          entity: 'Contact',
          entityId: id,
          success: true,
          metadata: { action: 'marked_read' },
        },
      }),
    ]);

    this.gateway.emitMessageUpdated(updated, 'read');
    await this.invalidateCaches(id);

    return updated;
  }

  async markAllAsRead(actorId: string) {
    const [result] = await this.prisma.$transaction([
      this.prisma.contact.updateMany({
        where: {
          status: { in: [ContactStatus.NEW, ContactStatus.READ] },
          deletedAt: null,
        },
        data: { status: ContactStatus.READ },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.UPDATE,
          entity: 'Contact',
          entityId: null,
          success: true,
          metadata: { action: 'mark_all_read' },
        },
      }),
    ]);

    await this.invalidateCaches();
    this.logger.log(`${result.count} messages marques comme lus`);

    return { count: result.count };
  }

  async reply(id: string, dto: ReplyContactDto, adminId: string) {
    const contact = await this.findOne(id);

    if (contact.status === ContactStatus.ARCHIVED) {
      throw new BadRequestException(
        'Impossible de repondre a un message archive',
      );
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.contact.update({
          where: { id },
          data: {
            reply: dto.reply,
            status: ContactStatus.REPLIED,
            repliedAt: new Date(),
            repliedById: adminId,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: AuditAction.RESPOND,
            entity: 'Contact',
            entityId: id,
            success: true,
            metadata: {},
          },
        });

        return result;
      });

      this.gateway.emitMessageUpdated(updated, 'replied');
      await this.invalidateCaches(id);

      await this.emailQueueService.send({
        to: contact.email,
        subject: 'Reponse a votre message',
        template: 'contacts/contact-reply',
        context: {
          name: contact.name,
          message: contact.message,
          reply: dto.reply,
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Ecriture BDD echouee apres tentative de reponse pour ${id}, mise en reconciliation`,
        error,
      );

      await this.reconciliationQueue.add(
        RECONCILE_REPLY_JOB,
        { contactId: id, reply: dto.reply, adminId },
        {
          attempts: RECONCILIATION_ATTEMPTS,
          backoff: { type: 'exponential', delay: RECONCILIATION_BACKOFF_MS },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return {
        ...contact,
        reply: dto.reply,
        status: ContactStatus.REPLIED,
        pendingReconciliation: true,
      };
    }
  }

  async archive(id: string, actorId: string) {
    const contact = await this.findOne(id);

    if (contact.status === ContactStatus.ARCHIVED) {
      return contact;
    }

    if (
      contact.status === ContactStatus.NEW ||
      contact.status === ContactStatus.READ
    ) {
      const [updated] = await this.prisma.$transaction([
        this.prisma.contact.update({
          where: { id },
          data: { status: ContactStatus.ARCHIVED, archivedAt: new Date() },
        }),
        this.prisma.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.UPDATE,
            entity: 'Contact',
            entityId: id,
            success: true,
            metadata: { action: 'archived' },
          },
        }),
      ]);

      this.gateway.emitMessageUpdated(updated, 'archived');
      await this.invalidateCaches(id);

      return updated;
    }

    throw new BadRequestException(
      'Seuls les messages non repondus peuvent etre archives',
    );
  }

  async unarchive(id: string, actorId: string) {
    await this.findOne(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.contact.update({
        where: { id },
        data: { status: ContactStatus.READ, archivedAt: null },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.UPDATE,
          entity: 'Contact',
          entityId: id,
          success: true,
          metadata: { action: 'unarchived' },
        },
      }),
    ]);

    this.gateway.emitMessageUpdated(updated, 'unarchived');
    await this.invalidateCaches(id);

    return updated;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);

    await this.prisma.$transaction([
      this.prisma.contact.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.DELETE,
          entity: 'Contact',
          entityId: id,
          success: true,
          metadata: { type: 'soft_delete' },
        },
      }),
    ]);

    this.gateway.emitMessageDeleted(id);
    await this.invalidateCaches(id);

    return { success: true };
  }

  async bulkDelete(dto: BulkOperationDto, actorId: string) {
    const { ids, permanent = false } = dto;

    let deleted = 0;
    const failedIds: string[] = [];

    for (const id of ids) {
      try {
        if (permanent) {
          await this.prisma.$transaction([
            this.prisma.contact.delete({ where: { id } }),
            this.prisma.auditLog.create({
              data: {
                userId: actorId,
                action: AuditAction.DELETE,
                entity: 'Contact',
                entityId: id,
                success: true,
                metadata: { type: 'permanent_delete', bulk: true },
              },
            }),
          ]);
        } else {
          await this.prisma.$transaction([
            this.prisma.contact.update({
              where: { id },
              data: { deletedAt: new Date() },
            }),
            this.prisma.auditLog.create({
              data: {
                userId: actorId,
                action: AuditAction.DELETE,
                entity: 'Contact',
                entityId: id,
                success: true,
                metadata: { type: 'soft_delete', bulk: true },
              },
            }),
          ]);
        }
        deleted++;
        this.gateway.emitMessageDeleted(id);
      } catch (error) {
        failedIds.push(id);
        this.logger.warn(
          `Echec suppression du message ${id}: ${(error as Error).message}`,
        );

        await this.prisma.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.DELETE,
            entity: 'Contact',
            entityId: id,
            success: false,
            metadata: {
              type: permanent ? 'permanent_delete' : 'soft_delete',
              bulk: true,
              error: (error as Error).message,
            },
          },
        });
      }
    }

    await this.invalidateCaches();
    this.logger.log(`${deleted} messages supprimes en masse`);

    return {
      deleted,
      failed: failedIds.length,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
    };
  }

  async getStatistics(): Promise<ContactStatistics> {
    const cached = await this.redis.get(this.STATS_CACHE_KEY);
    if (cached) {
      this.logger.debug('Statistiques servies depuis le cache');
      return JSON.parse(cached) as ContactStatistics;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const [
      total,
      unread,
      replied,
      pending,
      archived,
      todayCount,
      weekCount,
      monthCount,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { deletedAt: null } }),
      this.prisma.contact.count({
        where: {
          status: { in: [ContactStatus.NEW, ContactStatus.READ] },
          deletedAt: null,
        },
      }),
      this.prisma.contact.count({
        where: { status: ContactStatus.REPLIED, deletedAt: null },
      }),
      this.prisma.contact.count({
        where: { status: ContactStatus.NEW, deletedAt: null },
      }),
      this.prisma.contact.count({
        where: { status: ContactStatus.ARCHIVED, deletedAt: null },
      }),
      this.prisma.contact.count({
        where: { createdAt: { gte: today }, deletedAt: null },
      }),
      this.prisma.contact.count({
        where: { createdAt: { gte: weekAgo }, deletedAt: null },
      }),
      this.prisma.contact.count({
        where: { createdAt: { gte: monthAgo }, deletedAt: null },
      }),
    ]);

    const responseRate =
      total > 0 ? Math.round((replied / total) * 100 * 10) / 10 : 0;

    const stats: ContactStatistics = {
      total,
      unread,
      replied,
      pending,
      archived,
      responseRate,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      generatedAt: new Date().toISOString(),
    };

    await this.redis.set(
      this.STATS_CACHE_KEY,
      JSON.stringify(stats),
      'EX',
      this.CACHE_TTL,
    );
    this.logger.debug(
      `Statistiques calculees - Total: ${total}, Non lus: ${unread}`,
    );

    return stats;
  }

  async getUnreadCount() {
    const count = await this.prisma.contact.count({
      where: {
        status: { in: [ContactStatus.NEW, ContactStatus.READ] },
        deletedAt: null,
      },
    });

    return { count, unread: count };
  }

  private async invalidateCaches(id?: string) {
    const redis = this.redis;

    await redis.del(this.STATS_CACHE_KEY);

    if (id) {
      await redis.del(`contact:${id}`);
    }

    const keys = await redis.keys('contacts:list:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    this.logger.debug(`Cache invalide${id ? ` pour le contact ${id}` : ''}`);
  }

  /**
   * Masque un email dans les logs : test@example.com → te***t@ex***e.com
   */
  private maskEmail(email: string): string {
    if (!email || email.length === 0) return '***';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [local, domain] = parts;
    if (local.length <= 2) {
      return `${local}@${this.maskDomain(domain)}`;
    }
    const maskedLocal =
      local.substring(0, 2) + '***' + local.substring(local.length - 1);
    return `${maskedLocal}@${this.maskDomain(domain)}`;
  }

  private maskDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length < 2) return '***';
    const tld = parts.pop();
    const domainName = parts.join('.');
    if (domainName.length <= 2) {
      return `${domainName}.${tld}`;
    }
    const masked =
      domainName.substring(0, 2) +
      '***' +
      domainName.substring(domainName.length - 1);
    return `${masked}.${tld}`;
  }
}
