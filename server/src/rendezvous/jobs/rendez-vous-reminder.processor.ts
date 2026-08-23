// rendez-vous/jobs/processors/rendez-vous-reminder.processor.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { AvailabilityService } from '@/availability/availability.service';
import { TIME_SLOT_CLOCK } from '@/availability/constants/availability.constants';
import { RendezvousStatus, TimeSlot } from '@prisma/client';

@Injectable()
export class RendezVousReminderProcessor implements OnModuleInit {
  private readonly logger = new Logger(RendezVousReminderProcessor.name);
  private readonly REMINDER_24H_WINDOW_START_MS = 24 * 60 * 60 * 1000;
  private readonly REMINDER_24H_WINDOW_END_MS =
    24 * 60 * 60 * 1000 + 20 * 60 * 1000;
  private readonly REMINDER_5H_WINDOW_START_MS = 5 * 60 * 60 * 1000;
  private readonly REMINDER_5H_WINDOW_END_MS =
    5 * 60 * 60 * 1000 + 20 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueueService: EmailQueueService,
    private readonly availabilityService: AvailabilityService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.logger.log('RendezVousReminderProcessor initialise');
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendUpcomingReminders(): Promise<void> {
    const now = new Date();

    await this.sendRemindersForWindow(
      now,
      this.REMINDER_24H_WINDOW_START_MS,
      this.REMINDER_24H_WINDOW_END_MS,
      '24h',
    );

    await this.sendRemindersForWindow(
      now,
      this.REMINDER_5H_WINDOW_START_MS,
      this.REMINDER_5H_WINDOW_END_MS,
      '5h',
    );
  }

  private async sendRemindersForWindow(
    now: Date,
    windowStartMs: number,
    windowEndMs: number,
    label: string,
  ): Promise<void> {
    const windowStart = new Date(now.getTime() + windowStartMs);
    const windowEnd = new Date(now.getTime() + windowEndMs);

    const candidates = await this.prisma.rendezVous.findMany({
      where: {
        status: RendezvousStatus.CONFIRMED,
        date: {
          gte: this.startOfDay(windowStart),
          lte: this.startOfDay(windowEnd),
        },
        AND: [
          {
            OR: [
              { reminderSentAt: null },
              {
                reminderSentAt: {
                  lt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      include: { destination: true, consultant: true },
    });

    let sentCount = 0;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    for (const rendezVous of candidates) {
      const slotDateTime = this.buildSlotDateTime(
        rendezVous.date,
        rendezVous.time,
      );
      const timeUntilSlot = slotDateTime.getTime() - now.getTime();

      // Verifier si le rendez-vous tombe dans la fenetre
      if (slotDateTime < windowStart || slotDateTime > windowEnd) {
        continue;
      }

      // Verifier quel type de rappel envoyer
      const is24hReminder =
        timeUntilSlot >= 23 * 60 * 60 * 1000 &&
        timeUntilSlot <= 25 * 60 * 60 * 1000;
      const is5hReminder =
        timeUntilSlot >= 4 * 60 * 60 * 1000 &&
        timeUntilSlot <= 6 * 60 * 60 * 1000;

      let reminderType: '24h' | '5h' | null = null;

      if (is24hReminder && label === '24h') {
        reminderType = '24h';
      } else if (is5hReminder && label === '5h') {
        reminderType = '5h';
      }

      if (!reminderType) {
        continue;
      }

      // Verifier si ce rappel a deja ete envoye
      const reminderKey = `reminder_${reminderType}`;
      const existingReminder = rendezVous.reminderSentAt;

      if (existingReminder) {
        // Si le rappel 24h a deja ete envoye, on peut envoyer le 5h
        if (reminderType === '5h') {
          // Verifier si le rappel 5h a deja ete envoye via un champ dedie ou via la date
          // On utilise une heuristique: si le dernier rappel date de moins de 12h, on ne renvoie pas
          const hoursSinceLastReminder =
            (now.getTime() - existingReminder.getTime()) / (60 * 60 * 1000);
          if (hoursSinceLastReminder < 12) {
            continue;
          }
        } else {
          // Pour le rappel 24h, on ne renvoie pas si deja envoye
          continue;
        }
      }

      // Marquer le rappel comme envoye
      await this.prisma.rendezVous.update({
        where: { id: rendezVous.id },
        data: { reminderSentAt: new Date() },
      });

      // Envoyer l'email selon le type
      const template =
        reminderType === '24h'
          ? 'rendez-vous/appointment-reminder-24h'
          : 'rendez-vous/appointment-reminder-5h';

      const subject =
        reminderType === '24h'
          ? 'Rappel : votre rendez-vous a lieu demain'
          : 'Rappel : votre rendez-vous a lieu dans 5 heures';

      await this.emailQueueService.send({
        to: rendezVous.email,
        subject,
        template,
        context: {
          destination: rendezVous.destination.country,
          consultant: `${rendezVous.consultant.firstName} ${rendezVous.consultant.lastName}`,
          date: rendezVous.date.toLocaleDateString('fr-FR'),
          heure: this.availabilityService.formatSlotLabel(rendezVous.time),
          FRONTEND_URL: frontendUrl,
        },
      });

      sentCount++;
      this.logger.debug(
        `Rappel ${reminderType} envoye pour le rendez-vous ${rendezVous.id}`,
      );
    }

    if (sentCount > 0) {
      this.logger.log(
        `${sentCount} rappel(s) ${label} de rendez-vous mis en file`,
      );
    }
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private buildSlotDateTime(date: Date, time: TimeSlot): Date {
    const clock = TIME_SLOT_CLOCK[time];

    if (!clock) {
      this.logger.error(
        `Creneau inconnu rencontre dans buildSlotDateTime: ${time}`,
      );
      throw new BadRequestException('Creneau horaire invalide');
    }

    const result = new Date(date);
    result.setHours(clock.hour, clock.minute, 0, 0);
    return result;
  }
}
