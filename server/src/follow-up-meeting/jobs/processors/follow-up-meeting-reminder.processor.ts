// follow-up-meeting/jobs/processors/follow-up-meeting-reminder.processor.ts
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
import { MeetingStatus, TimeSlot } from '@prisma/client';

@Injectable()
export class FollowUpMeetingReminderProcessor implements OnModuleInit {
  private readonly logger = new Logger(FollowUpMeetingReminderProcessor.name);
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
    this.logger.log('FollowUpMeetingReminderProcessor initialise');
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

    const candidates = await this.prisma.followUpMeeting.findMany({
      where: {
        status: MeetingStatus.CONFIRMED,
        date: {
          gte: this.startOfDay(windowStart),
          lte: this.startOfDay(windowEnd),
        },
      },
      include: {
        procedure: true,
        consultant: true,
        student: true,
      },
    });

    let sentCount = 0;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    for (const meeting of candidates) {
      const slotDateTime = this.buildSlotDateTime(meeting.date, meeting.time);
      const timeUntilSlot = slotDateTime.getTime() - now.getTime();

      if (slotDateTime < windowStart || slotDateTime > windowEnd) {
        continue;
      }

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

      if (meeting.reminderSentAt) {
        const hoursSinceLastReminder =
          (now.getTime() - meeting.reminderSentAt.getTime()) / (60 * 60 * 1000);
        if (hoursSinceLastReminder < 12) {
          continue;
        }
      }

      await this.prisma.followUpMeeting.update({
        where: { id: meeting.id },
        data: { reminderSentAt: new Date() },
      });

      const template =
        reminderType === '24h'
          ? 'follow-up-meeting/followup-reminder-24h'
          : 'follow-up-meeting/followup-reminder-5h';

      const subject =
        reminderType === '24h'
          ? 'Rappel : votre rendez-vous de suivi a lieu demain'
          : 'Rappel : votre rendez-vous de suivi a lieu dans 5 heures';

      await this.emailQueueService.send({
        to: meeting.student.email,
        subject,
        template,
        context: {
          studentName: `${meeting.student.firstName} ${meeting.student.lastName}`,
          procedureId: meeting.procedure.numeroDossier,
          consultant: `${meeting.consultant.firstName} ${meeting.consultant.lastName}`,
          date: meeting.date.toLocaleDateString('fr-FR'),
          heure: this.availabilityService.formatSlotLabel(meeting.time),
          FRONTEND_URL: frontendUrl,
          year: new Date().getFullYear(),
        },
      });

      sentCount++;
      this.logger.debug(
        `Rappel ${reminderType} envoye pour le rendez-vous de suivi ${meeting.id}`,
      );
    }

    if (sentCount > 0) {
      this.logger.log(
        `${sentCount} rappel(s) ${label} de rendez-vous de suivi mis en file`,
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
