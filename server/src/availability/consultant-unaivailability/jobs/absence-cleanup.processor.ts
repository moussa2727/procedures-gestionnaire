import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

// Purge les absences dont la date de fin est révolue depuis plus de 90
// jours — purement un nettoyage de table, aucune conséquence métier
// puisque la disponibilité ne dépend que des absences dont endDate >=
// aujourd'hui (voir ConsultantUnavailabilityRepository.isConsultantAbsentOnDate).
// Conserve un historique de 90 jours pour d'éventuels besoins d'audit
// avant purge définitive.
@Injectable()
export class AbsenceCleanupProcessor {
  private readonly logger = new Logger(AbsenceCleanupProcessor.name);
  private readonly RETENTION_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupExpiredAbsences(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.RETENTION_DAYS);
    cutoff.setHours(0, 0, 0, 0);

    const result = await this.prisma.consultantUnavailability.deleteMany({
      where: { endDate: { lt: cutoff } },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} absence(s) expirée(s) purgée(s)`);
    }
  }
}
