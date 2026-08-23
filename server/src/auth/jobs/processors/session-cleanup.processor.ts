// auth/jobs/processors/session-cleanup.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from '../../session.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class SessionCleanupProcessor {
  private readonly logger = new Logger(SessionCleanupProcessor.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionService.cleanupExpired();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcileOnlineStatus(): Promise<void> {
    this.logger.debug('Début de la réconciliation du statut en ligne');

    let corrected = 0;
    let skip = 0;
    let hasMore = true;

    // Traitement par lots pour éviter de charger tous les utilisateurs en mémoire
    while (hasMore) {
      const onlineUsers = await this.prisma.user.findMany({
        where: { isOnline: true },
        select: { id: true },
        skip,
        take: this.BATCH_SIZE,
      });

      if (onlineUsers.length === 0) {
        hasMore = false;
        break;
      }

      const userIds = onlineUsers.map((u) => u.id);

      // Récupérer toutes les sessions actives pour ces utilisateurs en UNE requête
      const activeSessions = await this.prisma.session.findMany({
        where: {
          userId: { in: userIds },
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      const activeUserIds = new Set(activeSessions.map((s) => s.userId));

      // Récupérer toutes les présences Redis en UNE requête
      const presenceKeys = userIds.map((id) => `ws:presence:${id}`);
      const client = this.redisService.getClient();
      const presenceCounts = await Promise.all(
        presenceKeys.map((key) => client.scard(key)),
      );

      const usersToFix: string[] = [];

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const hasSession = activeUserIds.has(userId);
        const wsCount = presenceCounts[i];

        // Si pas de sessions ET pas de WebSocket → corriger
        if (!hasSession && wsCount === 0) {
          usersToFix.push(userId);
        }
      }

      // Mettre à jour tous les utilisateurs à corriger en UNE requête
      if (usersToFix.length > 0) {
        const result = await this.prisma.user.updateMany({
          where: { id: { in: usersToFix } },
          data: {
            isOnline: false,
            lastSeen: new Date(),
          },
        });
        corrected += result.count;
        this.logger.debug(`${result.count} statuts corrigés dans ce lot`);
      }

      skip += this.BATCH_SIZE;
      if (onlineUsers.length < this.BATCH_SIZE) {
        hasMore = false;
      }
    }

    if (corrected > 0) {
      this.logger.log(`${corrected} statuts en ligne corrigés`);
    } else {
      this.logger.debug('Aucun statut à corriger');
    }
  }

  @Cron('0 3 * * *')
  async cleanupOrphanedPresence(): Promise<void> {
    this.logger.debug('Nettoyage des présences Redis orphelines');

    const client = this.redisService.getClient();
    const pattern = 'ws:presence:*';
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      this.logger.debug('Aucune présence Redis à nettoyer');
      return;
    }

    let cleaned = 0;
    let skip = 0;
    const BATCH = 100;

    // Traiter par lots
    while (skip < keys.length) {
      const batchKeys = keys.slice(skip, skip + BATCH);
      const userIds = batchKeys.map((key) => key.replace('ws:presence:', ''));

      // Vérifier l'existence des utilisateurs en UNE requête
      const existingUsers = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          isDeleted: false,
        },
        select: { id: true },
      });

      const existingUserIds = new Set(existingUsers.map((u) => u.id));

      // Récupérer les sessions actives pour tous ces utilisateurs en UNE requête
      const activeSessions = await this.prisma.session.findMany({
        where: {
          userId: { in: userIds },
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      const sessionUserIds = new Set(activeSessions.map((s) => s.userId));

      // Déterminer les clés à supprimer
      const keysToDelete: string[] = [];

      for (let i = 0; i < batchKeys.length; i++) {
        const key = batchKeys[i];
        const userId = userIds[i];

        const userExists = existingUserIds.has(userId);
        const hasSession = sessionUserIds.has(userId);

        if (!userExists || !hasSession) {
          keysToDelete.push(key);
        }
      }

      // Supprimer les clés orphelines en UNE requête
      if (keysToDelete.length > 0) {
        await client.del(...keysToDelete);
        cleaned += keysToDelete.length;
        this.logger.debug(
          `${keysToDelete.length} présences orphelines supprimées dans ce lot`,
        );
      }

      skip += BATCH;
    }

    if (cleaned > 0) {
      this.logger.log(`${cleaned} présences Redis orphelines nettoyées`);
    }
  }
}
