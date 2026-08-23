// rendez-vous/rendez-vous.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AvailabilityService } from '@/availability/availability.service';
import { LockingService } from '@/locking/locking.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { RendezVousGateway } from './rendez-vous.gateway';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { RescheduleRendezVousDto } from './dto/reschedule-rendez-vous.dto';
import { CancelRendezVousDto } from './dto/cancel-rendez-vous.dto';
import { SetOpinionDto } from './dto/set-opinion.dto';
import { RendezVousResponseDto } from './dto/rendez-vous-response.dto';
import {
  RendezVousDeviceContext,
  CANCELLATION_MIN_HOURS_BEFORE,
} from './interfaces/rendez-vous.interfaces';
import { TIME_SLOT_CLOCK } from '@/availability/constants/availability.constants';
import {
  AuditAction,
  CancelledBy,
  MeetingStatus,
  Prisma,
  RendezVous,
  RendezvousStatus,
  UserRole,
} from '@prisma/client';

const TERMINAL_STATUSES: RendezvousStatus[] = [
  RendezvousStatus.COMPLETED,
  RendezvousStatus.CANCELLED,
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
export class RendezVousService {
  private readonly logger = new Logger(RendezVousService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly lockingService: LockingService,
    private readonly emailQueueService: EmailQueueService,
    private readonly notificationsService: NotificationsService,
    private readonly rendezVousGateway: RendezVousGateway,
  ) {}

  async create(
    studentId: string,
    dto: CreateRendezVousDto,
    context: RendezVousDeviceContext,
  ): Promise<RendezVousResponseDto> {
    const date = this.parseDateOnly(dto.date);

    await this.availabilityService.assertSlotAvailable({
      consultantId: dto.consultantId,
      destinationId: dto.destinationId,
      date,
      time: dto.time,
    });

    const lockKey = this.lockingService.buildSlotLockKey(
      dto.consultantId,
      date,
      dto.time,
    );

    const { rendezVous, notification } = await this.lockingService.withLock(
      lockKey,
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const existingBooking = await tx.consultantBooking.findUnique({
            where: {
              consultantId_date_time: {
                consultantId: dto.consultantId,
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

          const newRendezVous = await tx.rendezVous.create({
            data: {
              studentId,
              consultantId: dto.consultantId,
              destinationId: dto.destinationId,
              firstName: dto.firstName,
              lastName: dto.lastName,
              email: dto.email,
              phone: dto.phone,
              sector: dto.sector,
              studyLevel: dto.studyLevel,
              date,
              time: dto.time,
              status: RendezvousStatus.CONFIRMED,
            },
          });

          await tx.consultantBooking.create({
            data: {
              consultantId: dto.consultantId,
              date,
              time: dto.time,
              rendezVousId: newRendezVous.id,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: studentId,
              action: AuditAction.CREATE,
              entity: 'RendezVous',
              entityId: newRendezVous.id,
              success: true,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              metadata: {
                consultantId: dto.consultantId,
                destinationId: dto.destinationId,
                date: dto.date,
                time: dto.time,
              },
            },
          });

          const newNotification =
            await this.notificationsService.createWithinTransaction(tx, {
              userId: dto.consultantId,
              type: 'RENDEZVOUS_CREATED',
              title: 'Nouveau rendez-vous',
              message: `Un nouveau rendez-vous a été pris le ${dto.date} à ${this.availabilityService.formatSlotLabel(dto.time)}.`,
              entity: 'RendezVous',
              entityId: newRendezVous.id,
            });

          return { rendezVous: newRendezVous, notification: newNotification };
        });
      },
    );

    await this.notifyCreated(rendezVous, notification);

    return this.toResponseDto(rendezVous);
  }

  async reschedule(
    id: string,
    actorId: string,
    actorRole: UserRole,
    dto: RescheduleRendezVousDto,
    context: RendezVousDeviceContext,
  ): Promise<RendezVousResponseDto> {
    const existing = await this.findOwnedOrThrow(id, actorId, actorRole);

    this.assertNotTerminal(existing);

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
      where: { rendezVousId: id },
    });

    if (!currentBooking) {
      this.logger.error(
        `RendezVous ${this.maskId(id)} actif sans ConsultantBooking associé`,
      );
      throw new BadRequestException(
        'Etat de réservation incohérent, contactez le support',
      );
    }

    await this.availabilityService.assertSlotAvailable({
      consultantId: existing.consultantId,
      destinationId: existing.destinationId,
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

            const result = await tx.rendezVous.update({
              where: { id },
              data: { date: newDate, time: dto.time },
            });

            await tx.auditLog.create({
              data: {
                userId: actorId,
                action: AuditAction.UPDATE,
                entity: 'RendezVous',
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
                type: 'RENDEZVOUS_RESCHEDULED',
                title: 'Rendez-vous replanifié',
                message: `Le rendez-vous du ${existing.date.toLocaleDateString('fr-FR')} a été déplacé au ${dto.date} à ${this.availabilityService.formatSlotLabel(dto.time)}.`,
                entity: 'RendezVous',
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
    dto: CancelRendezVousDto,
    context: RendezVousDeviceContext,
  ): Promise<RendezVousResponseDto> {
    const existing = await this.findOwnedOrThrow(id, actorId, actorRole);

    this.assertNotTerminal(existing);

    if (actorRole !== UserRole.ADMIN) {
      this.assertCancellationDelayRespected(existing);
    }

    const cancelledBy = this.resolveCancelledBy(actorRole);

    const lockKey = this.lockingService.buildSlotLockKey(
      existing.consultantId,
      existing.date,
      existing.time,
    );

    const { updated, notification } = await this.lockingService.withLock(
      lockKey,
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const result = await tx.rendezVous.update({
            where: { id },
            data: {
              status: RendezvousStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelledBy,
              cancellationReason: dto.reason,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: actorId,
              action: AuditAction.CANCEL,
              entity: 'RendezVous',
              entityId: id,
              success: true,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              metadata: { reason: dto.reason ?? null, cancelledBy },
            },
          });

          const recipientId =
            actorId === result.studentId
              ? result.consultantId
              : result.studentId;

          const newNotification =
            await this.notificationsService.createWithinTransaction(tx, {
              userId: recipientId,
              type: 'RENDEZVOUS_CANCELLED',
              title: 'Rendez-vous annulé',
              message: dto.reason
                ? `Le rendez-vous du ${result.date.toLocaleDateString('fr-FR')} a été annulé. Motif : ${dto.reason}`
                : `Le rendez-vous du ${result.date.toLocaleDateString('fr-FR')} a été annulé.`,
              entity: 'RendezVous',
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
    context: RendezVousDeviceContext,
  ): Promise<RendezVousResponseDto> {
    const existing = await this.findOwnedOrThrow(id, actorId, actorRole);

    this.assertNotTerminal(existing);

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Seul un consultant ou un administrateur peut clôturer un rendez-vous',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.rendezVous.update({
        where: { id },
        data: { status: RendezvousStatus.COMPLETED },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.COMPLETE,
          entity: 'RendezVous',
          entityId: id,
          success: true,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {},
        },
      });

      return result;
    });

    return this.toResponseDto(updated);
  }

  async setOpinion(
    id: string,
    consultantId: string,
    dto: SetOpinionDto,
    context: RendezVousDeviceContext,
  ): Promise<RendezVousResponseDto> {
    const existing = await this.prisma.rendezVous.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(
        `Rendez-vous #${this.maskId(id)} introuvable`,
      );
    }

    if (existing.consultantId !== consultantId) {
      throw new ForbiddenException(
        'Seul le consultant affecté peut donner un avis sur ce rendez-vous',
      );
    }

    if (existing.status === RendezvousStatus.CANCELLED) {
      throw new BadRequestException(
        'Impossible de donner un avis sur un rendez-vous annulé',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.rendezVous.update({
        where: { id },
        data: { opinion: dto.opinion },
      });

      await tx.auditLog.create({
        data: {
          userId: consultantId,
          action: AuditAction.RESPOND,
          entity: 'RendezVous',
          entityId: id,
          success: true,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { opinion: dto.opinion },
        },
      });

      return result;
    });

    return this.toResponseDto(updated);
  }

  async findOne(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<RendezVousResponseDto> {
    const rendezVous = await this.findOwnedOrThrow(id, actorId, actorRole);
    return this.toResponseDto(rendezVous);
  }

  async findAllForStudent(studentId: string): Promise<RendezVousResponseDto[]> {
    const list = await this.prisma.rendezVous.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
    return list.map((r) => this.toResponseDto(r));
  }

  async findAllForConsultant(
    consultantId: string,
  ): Promise<RendezVousResponseDto[]> {
    const list = await this.prisma.rendezVous.findMany({
      where: { consultantId },
      orderBy: { date: 'desc' },
    });
    return list.map((r) => this.toResponseDto(r));
  }

  async findAllForAdmin(): Promise<RendezVousResponseDto[]> {
    const list = await this.prisma.rendezVous.findMany({
      orderBy: { date: 'desc' },
    });
    return list.map((r) => this.toResponseDto(r));
  }

  private async findOwnedOrThrow(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<RendezVous> {
    const rendezVous = await this.prisma.rendezVous.findUnique({
      where: { id },
    });

    if (!rendezVous) {
      throw new NotFoundException(
        `Rendez-vous #${this.maskId(id)} introuvable`,
      );
    }

    if (actorRole === UserRole.ADMIN) {
      return rendezVous;
    }

    if (actorRole === UserRole.ETUDIANT && rendezVous.studentId !== actorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à agir sur ce rendez-vous",
      );
    }

    if (
      actorRole === UserRole.CONSULTANT &&
      rendezVous.consultantId !== actorId
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à agir sur ce rendez-vous",
      );
    }

    return rendezVous;
  }

  private assertNotTerminal(rendezVous: RendezVous): void {
    if (TERMINAL_STATUSES.includes(rendezVous.status)) {
      throw new BadRequestException(
        `Ce rendez-vous est ${rendezVous.status === RendezvousStatus.COMPLETED ? 'terminé' : 'annulé'} et ne peut plus être modifié`,
      );
    }
  }

  private assertCancellationDelayRespected(rendezVous: RendezVous): void {
    const slotDateTime = this.buildSlotDateTime(
      rendezVous.date,
      rendezVous.time,
    );
    const minCancellationTime = new Date(
      slotDateTime.getTime() - CANCELLATION_MIN_HOURS_BEFORE * 60 * 60 * 1000,
    );

    if (new Date() > minCancellationTime) {
      throw new BadRequestException(
        `L'annulation n'est plus possible moins de ${CANCELLATION_MIN_HOURS_BEFORE} heures avant le rendez-vous`,
      );
    }
  }

  private resolveCancelledBy(role: UserRole): CancelledBy {
    switch (role) {
      case UserRole.ADMIN:
        return CancelledBy.ADMIN;
      case UserRole.CONSULTANT:
        return CancelledBy.CONSULTANT;
      case UserRole.ETUDIANT:
        return CancelledBy.ETUDIANT;
      default:
        return CancelledBy.SYSTEM;
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

  private buildSlotDateTime(date: Date, time: string): Date {
    const clock = TIME_SLOT_CLOCK[time as keyof typeof TIME_SLOT_CLOCK];

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

  private toResponseDto(rendezVous: RendezVous): RendezVousResponseDto {
    return {
      id: rendezVous.id,
      studentId: rendezVous.studentId,
      consultantId: rendezVous.consultantId,
      destinationId: rendezVous.destinationId,
      firstName: rendezVous.firstName,
      lastName: rendezVous.lastName,
      email: rendezVous.email,
      phone: rendezVous.phone,
      sector: rendezVous.sector,
      studyLevel: rendezVous.studyLevel,
      date: rendezVous.date,
      time: rendezVous.time,
      status: rendezVous.status,
      opinion: rendezVous.opinion,
      cancelledAt: rendezVous.cancelledAt,
      cancellationReason: rendezVous.cancellationReason,
      createdAt: rendezVous.createdAt,
      updatedAt: rendezVous.updatedAt,
    };
  }

  private async notifyCreated(
    rendezVous: RendezVous,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const [student, consultant, destination] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: rendezVous.studentId } }),
      this.prisma.user.findUnique({ where: { id: rendezVous.consultantId } }),
      this.prisma.destination.findUnique({
        where: { id: rendezVous.destinationId },
      }),
    ]);

    this.rendezVousGateway.notifyRendezVousCreated(rendezVous);
    await this.notificationsService.pushPostCommit(notification);

    if (!student || !destination) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Confirmation de votre rendez-vous',
      template: 'rendez-vous/appointment-created',
      context: {
        destination: destination.country,
        consultant: consultant
          ? `${consultant.firstName} ${consultant.lastName}`
          : '',
        date: rendezVous.date.toLocaleDateString('fr-FR'),
        heure: this.availabilityService.formatSlotLabel(rendezVous.time),
      },
    });
  }

  private async notifyRescheduled(
    previous: RendezVous,
    updated: RendezVous,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: updated.studentId },
    });

    this.rendezVousGateway.notifyRendezVousRescheduled(updated);
    await this.notificationsService.pushPostCommit(notification);

    if (!student) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre rendez-vous a été replanifié',
      template: 'rendez-vous/appointment-rescheduled',
      context: {
        ancienneDate: previous.date.toLocaleDateString('fr-FR'),
        nouvelleDate: updated.date.toLocaleDateString('fr-FR'),
        nouvelleHeure: this.availabilityService.formatSlotLabel(updated.time),
      },
    });
  }

  private async notifyCancelled(
    rendezVous: RendezVous,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: rendezVous.studentId },
    });

    this.rendezVousGateway.notifyRendezVousCancelled(rendezVous);
    await this.notificationsService.pushPostCommit(notification);

    if (!student) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre rendez-vous a été annulé',
      template: 'rendez-vous/appointment-cancelled',
      context: {
        date: rendezVous.date.toLocaleDateString('fr-FR'),
        heure: this.availabilityService.formatSlotLabel(rendezVous.time),
        motif: rendezVous.cancellationReason ?? 'Non précisé',
      },
    });
  }

  /**
   * Masque un identifiant pour les logs : seuls les 3 premiers et derniers caractères sont visibles
   */
  private maskId(id: string): string {
    if (!id || id.length <= 8) return '***';
    return `${id.substring(0, 3)}...${id.substring(id.length - 3)}`;
  }
}
