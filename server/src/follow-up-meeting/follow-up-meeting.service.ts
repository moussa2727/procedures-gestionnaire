// follow-up-meeting/follow-up-meeting.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AvailabilityService } from '@/availability/availability.service';
import { LockingService } from '@/locking/locking.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { FollowUpMeetingGateway } from './follow-up-meeting.gateway';
import { CreateFollowUpMeetingDto } from './dto/create-follow-up-meeting.dto';
import { RescheduleFollowUpMeetingDto } from './dto/reschedule-follow-up-meeting.dto';
import { CancelFollowUpMeetingDto } from './dto/cancel-follow-up-meeting.dto';
import { FollowUpMeetingResponseDto } from './dto/follow-up-meeting-response.dto';
import {
  FollowUpMeetingDeviceContext,
  CANCELLATION_MIN_HOURS_BEFORE,
} from './interfaces/follow-up-meeting.interfaces';
import { TIME_SLOT_CLOCK } from '@/availability/constants/availability.constants';
import {
  AuditAction,
  FollowUpMeeting,
  MeetingCreator,
  MeetingStatus,
  Prisma,
  ProcedureStatus,
  RendezvousStatus,
  TimeSlot,
  UserRole,
} from '@prisma/client';

const TERMINAL_MEETING_STATUSES: MeetingStatus[] = [
  MeetingStatus.COMPLETED,
  MeetingStatus.CANCELLED,
];

const ACTIVE_RENDEZVOUS_STATUSES: RendezvousStatus[] = [
  RendezvousStatus.PENDING,
  RendezvousStatus.CONFIRMED,
];

const ACTIVE_MEETING_STATUSES: MeetingStatus[] = [
  MeetingStatus.PENDING,
  MeetingStatus.CONFIRMED,
];

@Injectable()
export class FollowUpMeetingService {
  private readonly logger = new Logger(FollowUpMeetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly availabilityService: AvailabilityService,
    private readonly lockingService: LockingService,
    private readonly emailQueueService: EmailQueueService,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: FollowUpMeetingGateway,
  ) {}

  async create(
    actorId: string,
    actorRole: UserRole,
    dto: CreateFollowUpMeetingDto,
    context: FollowUpMeetingDeviceContext,
  ): Promise<FollowUpMeetingResponseDto> {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id: dto.procedureId },
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure #${dto.procedureId} introuvable`);
    }

    if (actorRole === UserRole.ETUDIANT && procedure.studentId !== actorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas l'étudiant concerné par cette procédure",
      );
    }

    if (
      actorRole === UserRole.CONSULTANT &&
      procedure.consultantId !== actorId
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas le consultant affecté à cette procédure",
      );
    }

    if (procedure.status !== ProcedureStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Impossible de créer un rendez-vous de suivi : la procédure n'est pas en cours",
      );
    }

    const date = this.parseDateOnly(dto.date);

    await this.availabilityService.assertSlotAvailable({
      consultantId: procedure.consultantId,
      destinationId: procedure.destinationId,
      date,
      time: dto.time,
    });

    const createdBy: MeetingCreator =
      actorRole === UserRole.ETUDIANT
        ? MeetingCreator.ETUDIANT
        : MeetingCreator.CONSULTANT;

    const lockKey = this.lockingService.buildSlotLockKey(
      procedure.consultantId,
      date,
      dto.time,
    );

    const { meeting, notification } = await this.lockingService.withLock(
      lockKey,
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const existingBooking = await tx.consultantBooking.findUnique({
            where: {
              consultantId_date_time: {
                consultantId: procedure.consultantId,
                date,
                time: dto.time,
              },
            },
            include: { rendezVous: true, followUpMeeting: true },
          });

          if (existingBooking && this.isBookingTargetActive(existingBooking)) {
            throw new BadRequestException(
              'Le consultant a déjà un rendez-vous à ce créneau',
            );
          }

          const newMeeting = await tx.followUpMeeting.create({
            data: {
              procedureId: dto.procedureId,
              consultantId: procedure.consultantId,
              studentId: procedure.studentId,
              date,
              time: dto.time,
              createdBy,
              status: MeetingStatus.CONFIRMED,
              reason: dto.reason,
            },
          });

          await tx.consultantBooking.create({
            data: {
              consultantId: procedure.consultantId,
              date,
              time: dto.time,
              followUpMeetingId: newMeeting.id,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: actorId,
              action: AuditAction.CREATE,
              entity: 'FollowUpMeeting',
              entityId: newMeeting.id,
              success: true,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              metadata: {
                procedureId: dto.procedureId,
                date: dto.date,
                time: dto.time,
                createdBy,
              },
            },
          });

          const recipientId =
            createdBy === MeetingCreator.ETUDIANT
              ? procedure.consultantId
              : procedure.studentId;

          const newNotification =
            await this.notificationsService.createWithinTransaction(tx, {
              userId: recipientId,
              type: 'FOLLOWUP_CREATED',
              title: 'Nouveau rendez-vous de suivi',
              message: `Un rendez-vous de suivi a été fixé le ${dto.date} à ${this.availabilityService.formatSlotLabel(dto.time)}.`,
              entity: 'FollowUpMeeting',
              entityId: newMeeting.id,
            });

          return { meeting: newMeeting, notification: newNotification };
        });
      },
    );

    await this.notifyCreated(meeting, notification);

    return this.toResponseDto(meeting);
  }

  async reschedule(
    id: string,
    actorId: string,
    actorRole: UserRole,
    dto: RescheduleFollowUpMeetingDto,
    context: FollowUpMeetingDeviceContext,
  ): Promise<FollowUpMeetingResponseDto> {
    const existing = await this.findAccessibleOrThrow(id, actorId, actorRole);

    this.assertNotTerminal(existing);
    await this.assertProcedureStillActive(existing.procedureId);

    const newDate = this.parseDateOnly(dto.date);

    if (
      existing.date.getTime() === newDate.getTime() &&
      existing.time === dto.time
    ) {
      throw new BadRequestException(
        'Le nouveau créneau est identique au créneau actuel',
      );
    }

    const currentBooking = await this.prisma.consultantBooking.findUnique({
      where: { followUpMeetingId: id },
    });

    if (!currentBooking) {
      this.logger.error(
        `FollowUpMeeting ${id} actif sans ConsultantBooking associé`,
      );
      throw new BadRequestException(
        'Etat de réservation incohérent, contactez le support',
      );
    }

    const procedure = await this.prisma.procedure.findUniqueOrThrow({
      where: { id: existing.procedureId },
    });

    await this.availabilityService.assertSlotAvailable({
      consultantId: existing.consultantId,
      destinationId: procedure.destinationId,
      date: newDate,
      time: dto.time,
      excludeBookingId: currentBooking.id,
    });

    const oldLockKey = this.lockingService.buildSlotLockKey(
      existing.consultantId,
      existing.date,
      existing.time,
    );
    const newLockKey = this.lockingService.buildSlotLockKey(
      existing.consultantId,
      newDate,
      dto.time,
    );

    const [firstKey, secondKey] = [oldLockKey, newLockKey].sort();

    const { updated, notification } = await this.lockingService.withLock(
      firstKey,
      async () => {
        return this.lockingService.withLock(secondKey, async () => {
          return this.prisma.$transaction(async (tx) => {
            const conflictingBooking = await tx.consultantBooking.findUnique({
              where: {
                consultantId_date_time: {
                  consultantId: existing.consultantId,
                  date: newDate,
                  time: dto.time,
                },
              },
              include: { rendezVous: true, followUpMeeting: true },
            });

            if (
              conflictingBooking &&
              conflictingBooking.id !== currentBooking.id &&
              this.isBookingTargetActive(conflictingBooking)
            ) {
              throw new BadRequestException(
                "Le nouveau créneau vient d'être réservé par ailleurs",
              );
            }

            await tx.consultantBooking.update({
              where: { id: currentBooking.id },
              data: { date: newDate, time: dto.time },
            });

            const result = await tx.followUpMeeting.update({
              where: { id },
              data: { date: newDate, time: dto.time },
            });

            await tx.auditLog.create({
              data: {
                userId: actorId,
                action: AuditAction.UPDATE,
                entity: 'FollowUpMeeting',
                entityId: id,
                success: true,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                metadata: {
                  previousDate: existing.date.toISOString(),
                  previousTime: existing.time,
                  newDate: dto.date,
                  newTime: dto.time,
                },
              },
            });

            const recipientId =
              actorId === result.studentId
                ? result.consultantId
                : result.studentId;

            const newNotification =
              await this.notificationsService.createWithinTransaction(tx, {
                userId: recipientId,
                type: 'FOLLOWUP_RESCHEDULED',
                title: 'Rendez-vous de suivi replanifié',
                message: `Le rendez-vous de suivi du ${existing.date.toLocaleDateString('fr-FR')} a été déplacé au ${dto.date} à ${this.availabilityService.formatSlotLabel(dto.time)}.`,
                entity: 'FollowUpMeeting',
                entityId: id,
              });

            return { updated: result, notification: newNotification };
          });
        });
      },
    );

    await this.notifyRescheduled(existing, updated, notification);

    return this.toResponseDto(updated);
  }

  async cancel(
    id: string,
    actorId: string,
    actorRole: UserRole,
    dto: CancelFollowUpMeetingDto,
    context: FollowUpMeetingDeviceContext,
  ): Promise<FollowUpMeetingResponseDto> {
    const existing = await this.findAccessibleOrThrow(id, actorId, actorRole);

    this.assertNotTerminal(existing);

    if (actorRole !== UserRole.ADMIN) {
      this.assertCancellationDelayRespected(existing);
    }

    const lockKey = this.lockingService.buildSlotLockKey(
      existing.consultantId,
      existing.date,
      existing.time,
    );

    const { updated, notification } = await this.lockingService.withLock(
      lockKey,
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const result = await tx.followUpMeeting.update({
            where: { id },
            data: {
              status: MeetingStatus.CANCELLED,
              reason: dto.reason ?? existing.reason,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: actorId,
              action: AuditAction.CANCEL,
              entity: 'FollowUpMeeting',
              entityId: id,
              success: true,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              metadata: { reason: dto.reason ?? null },
            },
          });

          const recipientId =
            actorId === result.studentId
              ? result.consultantId
              : result.studentId;

          const newNotification =
            await this.notificationsService.createWithinTransaction(tx, {
              userId: recipientId,
              type: 'FOLLOWUP_CANCELLED',
              title: 'Rendez-vous de suivi annulé',
              message: dto.reason
                ? `Le rendez-vous de suivi du ${result.date.toLocaleDateString('fr-FR')} a été annulé. Motif : ${dto.reason}`
                : `Le rendez-vous de suivi du ${result.date.toLocaleDateString('fr-FR')} a été annulé.`,
              entity: 'FollowUpMeeting',
              entityId: id,
            });

          return { updated: result, notification: newNotification };
        });
      },
    );

    await this.notifyCancelled(updated, notification);

    return this.toResponseDto(updated);
  }

  async complete(
    id: string,
    actorId: string,
    actorRole: UserRole,
    context: FollowUpMeetingDeviceContext,
  ): Promise<FollowUpMeetingResponseDto> {
    const existing = await this.findAccessibleOrThrow(id, actorId, actorRole);

    this.assertNotTerminal(existing);

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Seul un consultant ou un administrateur peut clôturer ce rendez-vous de suivi',
      );
    }

    const { updated, notification } = await this.prisma.$transaction(
      async (tx) => {
        const result = await tx.followUpMeeting.update({
          where: { id },
          data: { status: MeetingStatus.COMPLETED },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.COMPLETE,
            entity: 'FollowUpMeeting',
            entityId: id,
            success: true,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            metadata: {},
          },
        });

        const newNotification =
          await this.notificationsService.createWithinTransaction(tx, {
            userId: result.studentId,
            type: 'FOLLOWUP_COMPLETED',
            title: 'Rendez-vous de suivi terminé',
            message: `Le rendez-vous de suivi du ${result.date.toLocaleDateString('fr-FR')} est terminé.`,
            entity: 'FollowUpMeeting',
            entityId: result.id,
          });

        return { updated: result, notification: newNotification };
      },
    );

    await this.notifyCompleted(updated, notification);

    return this.toResponseDto(updated);
  }

  async findOne(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<FollowUpMeetingResponseDto> {
    const meeting = await this.findAccessibleOrThrow(id, actorId, actorRole);
    return this.toResponseDto(meeting);
  }

  async findAllForProcedure(
    procedureId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<FollowUpMeetingResponseDto[]> {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id: procedureId },
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure #${procedureId} introuvable`);
    }

    if (actorRole === UserRole.ETUDIANT && procedure.studentId !== actorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à accéder à cette procédure",
      );
    }

    if (
      actorRole === UserRole.CONSULTANT &&
      procedure.consultantId !== actorId
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à accéder à cette procédure",
      );
    }

    const list = await this.prisma.followUpMeeting.findMany({
      where: { procedureId },
      orderBy: { date: 'desc' },
    });

    return list.map((m) => this.toResponseDto(m));
  }

  async findAllForStudent(
    studentId: string,
  ): Promise<FollowUpMeetingResponseDto[]> {
    const list = await this.prisma.followUpMeeting.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
    return list.map((m) => this.toResponseDto(m));
  }

  async findAllForConsultant(
    consultantId: string,
  ): Promise<FollowUpMeetingResponseDto[]> {
    const list = await this.prisma.followUpMeeting.findMany({
      where: { consultantId },
      orderBy: { date: 'desc' },
    });
    return list.map((m) => this.toResponseDto(m));
  }

  private async findAccessibleOrThrow(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<FollowUpMeeting> {
    const meeting = await this.prisma.followUpMeeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      throw new NotFoundException(`Rendez-vous de suivi #${id} introuvable`);
    }

    if (actorRole === UserRole.ADMIN) {
      return meeting;
    }

    if (actorRole === UserRole.ETUDIANT && meeting.studentId !== actorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à agir sur ce rendez-vous de suivi",
      );
    }

    if (actorRole === UserRole.CONSULTANT && meeting.consultantId !== actorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à agir sur ce rendez-vous de suivi",
      );
    }

    return meeting;
  }

  private assertNotTerminal(meeting: FollowUpMeeting): void {
    if (TERMINAL_MEETING_STATUSES.includes(meeting.status)) {
      throw new BadRequestException(
        `Ce rendez-vous de suivi est ${meeting.status === MeetingStatus.COMPLETED ? 'terminé' : 'annulé'} et ne peut plus être modifié`,
      );
    }
  }

  private async assertProcedureStillActive(procedureId: string): Promise<void> {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id: procedureId },
    });

    if (!procedure || procedure.status !== ProcedureStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Impossible de modifier ce rendez-vous de suivi : la procédure associée n'est plus en cours",
      );
    }
  }

  private assertCancellationDelayRespected(meeting: FollowUpMeeting): void {
    const slotDateTime = this.buildSlotDateTime(meeting.date, meeting.time);
    const minCancellationTime = new Date(
      slotDateTime.getTime() - CANCELLATION_MIN_HOURS_BEFORE * 60 * 60 * 1000,
    );

    if (new Date() > minCancellationTime) {
      throw new BadRequestException(
        `L'annulation n'est plus possible moins de ${CANCELLATION_MIN_HOURS_BEFORE} heures avant le rendez-vous`,
      );
    }
  }

  private isBookingTargetActive(
    booking: Prisma.ConsultantBookingGetPayload<{
      include: { rendezVous: true; followUpMeeting: true };
    }>,
  ): boolean {
    if (booking.rendezVousId && booking.rendezVous) {
      return ACTIVE_RENDEZVOUS_STATUSES.includes(booking.rendezVous.status);
    }
    if (booking.followUpMeetingId && booking.followUpMeeting) {
      return ACTIVE_MEETING_STATUSES.includes(booking.followUpMeeting.status);
    }
    return false;
  }

  private parseDateOnly(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private buildSlotDateTime(date: Date, time: TimeSlot): Date {
    const clock = TIME_SLOT_CLOCK[time];

    if (!clock) {
      this.logger.error(
        `Créneau inconnu rencontré dans buildSlotDateTime: ${time}`,
      );
      throw new BadRequestException('Créneau horaire invalide');
    }

    const result = new Date(date);
    result.setHours(clock.hour, clock.minute, 0, 0);
    return result;
  }

  private toResponseDto(meeting: FollowUpMeeting): FollowUpMeetingResponseDto {
    return {
      id: meeting.id,
      procedureId: meeting.procedureId,
      consultantId: meeting.consultantId,
      studentId: meeting.studentId,
      date: meeting.date,
      time: meeting.time,
      createdBy: meeting.createdBy,
      status: meeting.status,
      reason: meeting.reason,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }

  private async notifyCreated(
    meeting: FollowUpMeeting,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const [student, procedure, consultant] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: meeting.studentId } }),
      this.prisma.procedure.findUnique({ where: { id: meeting.procedureId } }),
      this.prisma.user.findUnique({ where: { id: meeting.consultantId } }),
    ]);

    this.gateway.notifyCreated(meeting);
    await this.notificationsService.pushPostCommit(notification);

    if (!student || !procedure || !consultant) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Confirmation de votre rendez-vous de suivi',
      template: 'follow-up-meeting/followup-created',
      context: {
        studentName: `${student.firstName} ${student.lastName}`,
        procedureId: procedure.numeroDossier,
        consultant: `${consultant.firstName} ${consultant.lastName}`,
        date: meeting.date.toLocaleDateString('fr-FR'),
        heure: this.availabilityService.formatSlotLabel(meeting.time),
        raison: meeting.reason ?? 'Non renseigné',
        FRONTEND_URL: this.configService.get<string>('FRONTEND_URL'),
      },
    });
  }

  private async notifyRescheduled(
    previous: FollowUpMeeting,
    updated: FollowUpMeeting,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const [student, procedure] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: updated.studentId } }),
      this.prisma.procedure.findUnique({ where: { id: updated.procedureId } }),
    ]);

    this.gateway.notifyRescheduled(updated);
    await this.notificationsService.pushPostCommit(notification);

    if (!student || !procedure) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre rendez-vous de suivi a été replanifié',
      template: 'follow-up-meeting/followup-rescheduled',
      context: {
        studentName: `${student.firstName} ${student.lastName}`,
        procedureId: procedure.numeroDossier,
        ancienneDate: previous.date.toLocaleDateString('fr-FR'),
        ancienneHeure: this.availabilityService.formatSlotLabel(previous.time),
        nouvelleDate: updated.date.toLocaleDateString('fr-FR'),
        nouvelleHeure: this.availabilityService.formatSlotLabel(updated.time),
        FRONTEND_URL: this.configService.get<string>('FRONTEND_URL'),
      },
    });
  }

  private async notifyCancelled(
    meeting: FollowUpMeeting,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const [student, procedure] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: meeting.studentId } }),
      this.prisma.procedure.findUnique({ where: { id: meeting.procedureId } }),
    ]);

    this.gateway.notifyCancelled(meeting);
    await this.notificationsService.pushPostCommit(notification);

    if (!student || !procedure) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre rendez-vous de suivi a été annulé',
      template: 'follow-up-meeting/followup-cancelled',
      context: {
        studentName: `${student.firstName} ${student.lastName}`,
        procedureId: procedure.numeroDossier,
        date: meeting.date.toLocaleDateString('fr-FR'),
        heure: this.availabilityService.formatSlotLabel(meeting.time),
        motif: meeting.reason ?? 'Non précisé',
        FRONTEND_URL: this.configService.get<string>('FRONTEND_URL'),
      },
    });
  }

  private async notifyCompleted(
    meeting: FollowUpMeeting,
    notification: { id: string; userId: string },
  ): Promise<void> {
    this.gateway.notifyCompleted(meeting);
    await this.notificationsService.pushPostCommit(notification);
  }
}
