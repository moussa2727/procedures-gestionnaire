// auth/jobs/processors/log-cleanup.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class LogCleanupProcessor {
  private readonly logger = new Logger(LogCleanupProcessor.name);

  // Duree de retention : 6 mois
  private readonly RETENTION_DAYS = 180;

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 4 * * *')
  async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    this.logger.log(
      `Debut de la purge des logs anterieurs a ${cutoffDate.toISOString()}`,
    );

    try {
      const deletedAuditLogs = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      const deletedLoginHistory = await this.prisma.loginHistory.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      const totalDeleted = deletedAuditLogs.count + deletedLoginHistory.count;

      if (totalDeleted > 0) {
        this.logger.log(
          `Purge terminee : ${deletedAuditLogs.count} logs d'audit et ` +
            `${deletedLoginHistory.count} historiques de connexion supprimes ` +
            `(total: ${totalDeleted})`,
        );
      } else {
        this.logger.log('Aucun log a purger.');
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors de la purge des logs : ${(error as Error).message}`,
      );
      throw error;
    }
  }

  @Cron('0 5 * * *')
  async cleanupOldSessions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    try {
      const deleted = await this.prisma.session.deleteMany({
        where: {
          isActive: false,
          deactivatedAt: { lt: cutoffDate },
        },
      });

      if (deleted.count > 0) {
        this.logger.log(`${deleted.count} sessions desactivees purgees`);
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors de la purge des sessions : ${(error as Error).message}`,
      );
    }
  }
}
