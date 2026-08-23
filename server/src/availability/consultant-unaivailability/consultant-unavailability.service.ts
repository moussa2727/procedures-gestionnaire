// availability/consultant-unavailability/consultant-unavailability.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { ConsultantUnavailabilityRepository } from '../repositories/consultant-unavailability.repository';
import { ConsultantUnavailabilityGateway } from './consultant-unavailability.gateway';
import { CreateUnavailabilityDto } from './dto/create-unavailability.dto';
import { UnavailabilityResponseDto } from './dto/unavailability-response.dto';
import {
  AuditAction,
  ConsultantUnavailability,
  UserRole,
} from '@prisma/client';
import { NotificationsService } from '@/notifications/notifications.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConsultantUnavailabilityService {
  private readonly logger = new Logger(ConsultantUnavailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ConsultantUnavailabilityRepository,
    private readonly redisService: RedisService,
    private readonly gateway: ConsultantUnavailabilityGateway,
    private readonly notificationsService: NotificationsService,
    private readonly emailQueueService: EmailQueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * README, contrainte d'accès : seul le consultant lui-même (pour son
   * propre compte) ou l'admin (pour tout consultant) peut créer une
   * absence. Vérification de chevauchement avant toute écriture — deux
   * absences qui se recoupent pour le même consultant violeraient la
   * notion de "journée noire" unique et cohérente.
   */
  async create(
    actorId: string,
    actorRole: UserRole,
    targetConsultantId: string,
    dto: CreateUnavailabilityDto,
  ): Promise<UnavailabilityResponseDto> {
    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Action réservée aux consultants et administrateurs',
      );
    }

    if (actorRole === UserRole.CONSULTANT && actorId !== targetConsultantId) {
      throw new ForbiddenException(
        'Vous ne pouvez déclarer une absence que pour votre propre compte',
      );
    }

    const consultant = await this.prisma.user.findFirst({
      where: {
        id: targetConsultantId,
        role: UserRole.CONSULTANT,
        isDeleted: false,
      },
    });

    if (!consultant) {
      throw new NotFoundException(
        `Consultant #${targetConsultantId} introuvable`,
      );
    }

    const startDate = this.parseDateOnly(dto.startDate);
    const endDate = this.parseDateOnly(dto.endDate);

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'La date de début doit précéder ou égaler la date de fin',
      );
    }

    const overlapping = await this.repository.findOverlapping(
      targetConsultantId,
      startDate,
      endDate,
    );

    if (overlapping.length > 0) {
      throw new BadRequestException(
        'Cette période chevauche une absence déjà déclarée pour ce consultant',
      );
    }

    const { absence, notification } = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.consultantUnavailability.create({
          data: {
            consultantId: targetConsultantId,
            startDate,
            endDate,
            type: dto.type,
            reason: dto.reason,
            createdBy: actorId,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.CONSULTANT_ABSENCE_CREATED,
            entity: 'ConsultantUnavailability',
            entityId: created.id,
            success: true,
            metadata: {
              consultantId: targetConsultantId,
              startDate: dto.startDate,
              endDate: dto.endDate,
              type: dto.type,
            },
          },
        });

        // Notification admin uniquement si c'est le consultant lui-même qui
        // déclare son absence — un admin n'a pas besoin d'être notifié de
        // sa propre action.
        let newNotification: Awaited<
          ReturnType<NotificationsService['createWithinTransaction']>
        > | null = null;
        if (actorRole === UserRole.CONSULTANT) {
          const admin = await tx.user.findFirst({
            where: { role: UserRole.ADMIN },
          });
          if (admin) {
            newNotification =
              await this.notificationsService.createWithinTransaction(tx, {
                userId: admin.id,
                type: 'CONSULTANT_ABSENCE_DECLARED',
                title: 'Absence consultant déclarée',
                message: `${consultant.firstName} ${consultant.lastName} a déclaré une absence (${dto.type}) du ${dto.startDate} au ${dto.endDate}.`,
                entity: 'ConsultantUnavailability',
                entityId: created.id,
              });
          }
        }

        return { absence: created, notification: newNotification };
      },
    );

    // README, cohérence du cache : invalide les vues de disponibilité
    // consultant affectées par ce changement. L'absence étant globale,
    // toutes les destinations affectées au consultant sont concernées.
    await this.invalidateConsultantCaches(targetConsultantId);

    this.gateway.notifyAbsenceCreated(targetConsultantId, absence);

    // Gestion post-transaction des notifications et emails
    if (notification) {
      await this.notificationsService.pushPostCommit(notification);

      const admin = await this.prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
      });
      if (admin) {
        await this.emailQueueService.send({
          to: admin.email,
          subject: 'Absence consultant déclarée',
          template: 'consultant-unavailability/absence-declared',
          context: {
            consultantName: `${consultant.firstName} ${consultant.lastName}`,
            type: dto.type,
            startDate: dto.startDate,
            endDate: dto.endDate,
            reason: dto.reason ?? 'Non précisé',
          },
        });
      }
    }

    return this.toResponseDto(absence);
  }

  async delete(
    actorId: string,
    actorRole: UserRole,
    absenceId: string,
  ): Promise<void> {
    const absence = await this.repository.findById(absenceId);

    if (!absence) {
      throw new NotFoundException(`Absence #${absenceId} introuvable`);
    }

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Action réservée aux consultants et administrateurs',
      );
    }

    if (actorRole === UserRole.CONSULTANT && actorId !== absence.consultantId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres absences',
      );
    }

    // Récupérer le consultant pour les notifications
    const consultant = await this.prisma.user.findFirst({
      where: {
        id: absence.consultantId,
        role: UserRole.CONSULTANT,
        isDeleted: false,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.consultantUnavailability.delete({ where: { id: absenceId } });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.CONSULTANT_ABSENCE_DELETED,
          entity: 'ConsultantUnavailability',
          entityId: absenceId,
          success: true,
          metadata: { consultantId: absence.consultantId },
        },
      });

      // Notification admin si suppression par le consultant lui-même
      if (actorRole === UserRole.CONSULTANT && consultant) {
        const admin = await tx.user.findFirst({
          where: { role: UserRole.ADMIN },
        });
        if (admin) {
          await this.notificationsService.createWithinTransaction(tx, {
            userId: admin.id,
            type: 'CONSULTANT_ABSENCE_DECLARED',
            title: 'Absence consultant supprimée',
            message: `${consultant.firstName} ${consultant.lastName} a supprimé une absence.`,
            entity: 'ConsultantUnavailability',
            entityId: absenceId,
          });
        }
      }
    });

    await this.invalidateConsultantCaches(absence.consultantId);

    this.gateway.notifyAbsenceDeleted(absence.consultantId, absenceId);
  }

  async findForConsultant(
    consultantId: string,
  ): Promise<UnavailabilityResponseDto[]> {
    const list = await this.repository.findAllForConsultant(consultantId);
    return list.map((a) => this.toResponseDto(a));
  }

  async findForConsultantInRange(
    consultantId: string,
    start: string,
    end: string,
  ): Promise<UnavailabilityResponseDto[]> {
    const list = await this.repository.findForConsultantInRange(
      consultantId,
      this.parseDateOnly(start),
      this.parseDateOnly(end),
    );
    return list.map((a) => this.toResponseDto(a));
  }

  /**
   * Point d'entrée exclusif pour AvailabilityService — jamais le
   * repository directement depuis l'extérieur du sous-module, pour
   * préserver son encapsulation.
   */
  async isAbsentOnDate(consultantId: string, date: Date): Promise<boolean> {
    return this.repository.isConsultantAbsentOnDate(consultantId, date);
  }

  /**
   * Invalide le cache Redis des vues de disponibilité consultant — mêmes
   * clés que ConsultantDestinationService, puisque l'ensemble "consultants
   * réellement disponibles" pour chaque destination du consultant change
   * avec toute création/suppression d'absence.
   */
  private async invalidateConsultantCaches(
    consultantId: string,
  ): Promise<void> {
    const assignments = await this.prisma.consultantDestination.findMany({
      where: { consultantId },
      select: { destinationId: true },
    });

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    for (const { destinationId } of assignments) {
      pipeline.del(`destination:${destinationId}`);
    }
    pipeline.del('destinations:all');
    pipeline.del(`user:public:${consultantId}`);

    await pipeline.exec();
  }

  private parseDateOnly(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toResponseDto(
    absence: ConsultantUnavailability,
  ): UnavailabilityResponseDto {
    return {
      id: absence.id,
      consultantId: absence.consultantId,
      startDate: absence.startDate,
      endDate: absence.endDate,
      type: absence.type,
      reason: absence.reason,
      createdBy: absence.createdBy,
      createdAt: absence.createdAt,
    };
  }
}
