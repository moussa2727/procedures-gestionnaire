// procedure/procedure.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { ProcedureGateway } from './procedure.gateway';
import { LockingService } from '@/locking/locking.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CancelProcedureDto } from './dto/cancel-procedure.dto';
import { RejectProcedureDto } from './dto/reject-procedure.dto';
import { ProcedureResponseDto } from './dto/procedure-response.dto';
import { ProcedureDeviceContext } from './interfaces/procedure.interfaces';
import {
  AuditAction,
  MeetingStatus,
  Procedure,
  ProcedureComment,
  ProcedureStatus,
  RendezvousStatus,
  Step,
  StepStatus,
  UserRole,
} from '@prisma/client';

const TERMINAL_PROCEDURE_STATUSES: ProcedureStatus[] = [
  ProcedureStatus.COMPLETED,
  ProcedureStatus.REJECTED,
  ProcedureStatus.CANCELLED,
];

const CASCADE_ELIGIBLE_STATUSES: StepStatus[] = [
  StepStatus.PENDING,
  StepStatus.IN_PROGRESS,
];

@Injectable()
export class ProcedureService {
  private readonly logger = new Logger(ProcedureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueueService: EmailQueueService,
    private readonly notificationsService: NotificationsService,
    private readonly procedureGateway: ProcedureGateway,
    private readonly lockingService: LockingService,
  ) {}

  private static isStepTerminalLocked(status: StepStatus): boolean {
    return status === StepStatus.REJECTED;
  }

  async create(
    actorId: string,
    actorRole: UserRole,
    dto: CreateProcedureDto,
    context: ProcedureDeviceContext,
  ): Promise<ProcedureResponseDto> {
    const rendezVous = await this.prisma.rendezVous.findUnique({
      where: { id: dto.rendezVousId },
      include: { procedure: true },
    });

    if (!rendezVous) {
      throw new NotFoundException(
        `Rendez-vous #${dto.rendezVousId} introuvable`,
      );
    }

    if (
      actorRole === UserRole.CONSULTANT &&
      rendezVous.consultantId !== actorId
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas le consultant affecté à ce rendez-vous",
      );
    }

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Seul un consultant ou un administrateur peut ouvrir une procédure',
      );
    }

    if (
      rendezVous.status !== RendezvousStatus.CONFIRMED &&
      rendezVous.status !== RendezvousStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Une procédure ne peut être ouverte que pour un rendez-vous confirmé ou terminé',
      );
    }

    if (rendezVous.procedure) {
      throw new BadRequestException(
        'Une procédure existe déjà pour ce rendez-vous',
      );
    }

    if (dto.stepNames.length === 0) {
      throw new BadRequestException('Au moins une étape doit être définie');
    }

    const { procedure, notification } = await this.prisma.$transaction(
      async (tx) => {
        const stillFree = await tx.procedure.findUnique({
          where: { rendezVousId: dto.rendezVousId },
        });

        if (stillFree) {
          throw new BadRequestException(
            'Une procédure existe déjà pour ce rendez-vous',
          );
        }

        const newProcedure = await tx.procedure.create({
          data: {
            rendezVousId: dto.rendezVousId,
            studentId: rendezVous.studentId,
            consultantId: rendezVous.consultantId,
            destinationId: rendezVous.destinationId,
            status: ProcedureStatus.IN_PROGRESS,
          },
        });

        await tx.step.createMany({
          data: dto.stepNames.map((stepName, index) => ({
            procedureId: newProcedure.id,
            stepName,
            orderIndex: index,
            status: StepStatus.PENDING,
          })),
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.CREATE,
            entity: 'Procedure',
            entityId: newProcedure.id,
            success: true,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            metadata: {
              numeroDossier: newProcedure.numeroDossier,
              rendezVousId: dto.rendezVousId,
              stepCount: dto.stepNames.length,
            },
          },
        });

        const newNotification =
          await this.notificationsService.createWithinTransaction(tx, {
            userId: newProcedure.studentId,
            type: 'PROCEDURE_CREATED',
            title: 'Nouvelle procédure ouverte',
            message: `Votre procédure ${newProcedure.numeroDossier} a été ouverte.`,
            entity: 'Procedure',
            entityId: newProcedure.id,
          });

        return { procedure: newProcedure, notification: newNotification };
      },
    );

    await this.notifyCreated(procedure, notification);

    return this.toResponseDto(await this.loadWithRelations(procedure.id));
  }

  async updateStep(
    procedureId: string,
    stepId: string,
    actorId: string,
    actorRole: UserRole,
    dto: UpdateStepDto,
    context: ProcedureDeviceContext,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.findAccessibleOrThrow(
      procedureId,
      actorId,
      actorRole,
    );

    this.assertNotTerminal(procedure);

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        "Seul le consultant affecté ou un administrateur peut modifier l'avancement d'une étape",
      );
    }

    const step = await this.prisma.step.findFirst({
      where: { id: stepId, procedureId },
    });

    if (!step) {
      throw new NotFoundException(
        `Étape #${stepId} introuvable pour cette procédure`,
      );
    }

    if (ProcedureService.isStepTerminalLocked(step.status)) {
      throw new BadRequestException(
        'Cette étape a déjà été rejetée ou annulée par cascade et ne peut plus être modifiée directement',
      );
    }

    if (dto.status === StepStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Un motif de rejet est obligatoire');
    }

    if (dto.status === StepStatus.COMPLETED) {
      const hasPreviousRejected = await this.prisma.step.findFirst({
        where: {
          procedureId,
          orderIndex: { lt: step.orderIndex },
          status: StepStatus.REJECTED,
        },
      });

      if (hasPreviousRejected) {
        throw new BadRequestException(
          `Impossible de valider l'étape "${step.stepName}" : ` +
            `une étape précédente ("${hasPreviousRejected.stepName}") a été rejetée. ` +
            `Résolvez d'abord le rejet ou rejetez la procédure.`,
        );
      }
    }

    // Règle d'Or: Une étape ne peut être modifiée que si l'étape immédiatement précédente est COMPLETED
    // Vérifications obligatoires avant modification:
    // 1. Aucune étape précédente ne doit être REJECTED
    // 2. L'étape immédiatement précédente doit être COMPLETED
    // 3. Aucune étape précédente ne doit être PENDING ou IN_PROGRESS
    if (step.orderIndex > 0) {
      const previousStep = await this.prisma.step.findFirst({
        where: {
          procedureId,
          orderIndex: step.orderIndex - 1,
        },
      });

      if (previousStep) {
        if (previousStep.status === StepStatus.REJECTED) {
          throw new BadRequestException(
            `L'étape "${step.stepName}" ne peut pas être modifiée car l'étape "${previousStep.stepName}" a été rejetée.`,
          );
        }

        if (previousStep.status !== StepStatus.COMPLETED) {
          throw new BadRequestException(
            `L'étape "${step.stepName}" ne peut pas être modifiée car l'étape "${previousStep.stepName}" n'est pas encore terminée`,
          );
        }
      }
    }

    const lockKey = `lock:procedure:${procedureId}:step:${stepId}`;
    let notification: { id: string; userId: string } | null = null;
    const cascadedStepIds: string[] = [];

    const { updatedStep } = await this.lockingService.withLock(
      lockKey,
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const currentStep = await tx.step.findFirst({
            where: { id: stepId, procedureId },
          });

          if (
            !currentStep ||
            ProcedureService.isStepTerminalLocked(currentStep.status)
          ) {
            throw new BadRequestException(
              'Cette étape a été modifiée entre-temps et ne peut plus être modifiée',
            );
          }

          const result = await tx.step.update({
            where: { id: stepId },
            data: {
              status: dto.status,
              rejectionReason:
                dto.status === StepStatus.REJECTED ? dto.rejectionReason : null,
            },
          });

          let cascaded: string[] = [];

          if (dto.status === StepStatus.REJECTED) {
            const followingSteps = await tx.step.findMany({
              where: {
                procedureId,
                orderIndex: { gt: step.orderIndex },
                status: { in: CASCADE_ELIGIBLE_STATUSES },
              },
            });

            if (followingSteps.length > 0) {
              await tx.step.updateMany({
                where: { id: { in: followingSteps.map((s) => s.id) } },
                data: {
                  status: StepStatus.REJECTED,
                  rejectionReason: `Annulée en cascade suite au rejet de l'étape "${step.stepName}"`,
                  cascadeCancelledFromStepId: stepId,
                },
              });

              cascaded = followingSteps.map((s) => s.id);
            }
          }

          await tx.auditLog.create({
            data: {
              userId: actorId,
              action:
                dto.status === StepStatus.REJECTED
                  ? AuditAction.CANCEL
                  : AuditAction.UPDATE,
              entity: 'Step',
              entityId: stepId,
              success: true,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              metadata: {
                previousStatus: step.status,
                newStatus: dto.status,
                rejectionReason: dto.rejectionReason ?? null,
                cascadedStepIds: cascaded,
                direction:
                  dto.status === StepStatus.REJECTED
                    ? 'following_steps_affected'
                    : null,
              },
            },
          });

          if (cascaded.length > 0) {
            await tx.auditLog.create({
              data: {
                userId: actorId,
                action: AuditAction.CANCEL,
                entity: 'Step',
                entityId: procedureId,
                success: true,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                metadata: {
                  triggeredByStepId: stepId,
                  cascadedStepIds: cascaded,
                  reason: 'cascade_rejection_following_steps',
                },
              },
            });
          }

          if (dto.status === StepStatus.COMPLETED) {
            notification =
              await this.notificationsService.createWithinTransaction(tx, {
                userId: procedure.studentId,
                type: 'PROCEDURE_STEP_COMPLETED',
                title: 'Étape validée',
                message: `L'étape "${step.stepName}" de votre procédure a été validée.`,
                entity: 'Step',
                entityId: stepId,
              });
          } else if (dto.status === StepStatus.REJECTED) {
            notification =
              await this.notificationsService.createWithinTransaction(tx, {
                userId: procedure.studentId,
                type: 'PROCEDURE_STEP_REJECTED',
                title: 'Étape rejetée',
                message: `L'étape "${step.stepName}" de votre procédure a été rejetée.`,
                entity: 'Step',
                entityId: stepId,
              });
          }

          return { updatedStep: result, cascadedStepIds: cascaded };
        });
      },
      10000,
    );

    if (notification) {
      await this.notificationsService.pushPostCommit(notification);
    }

    if (dto.status === StepStatus.COMPLETED) {
      await this.notifyStepCompleted(procedure, updatedStep);
    } else if (dto.status === StepStatus.REJECTED) {
      await this.notifyStepRejected(
        procedure,
        updatedStep,
        dto.rejectionReason!,
        cascadedStepIds,
      );
    }

    return this.toResponseDto(await this.loadWithRelations(procedureId));
  }

  async complete(
    procedureId: string,
    actorId: string,
    actorRole: UserRole,
    context: ProcedureDeviceContext,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.findAccessibleOrThrow(
      procedureId,
      actorId,
      actorRole,
    );

    this.assertNotTerminal(procedure);

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Seul le consultant affecté ou un administrateur peut clôturer une procédure',
      );
    }

    const steps = await this.prisma.step.findMany({
      where: { procedureId },
      orderBy: { orderIndex: 'asc' },
    });

    const rejectedSteps = steps.filter((s) => s.status === StepStatus.REJECTED);
    if (rejectedSteps.length > 0) {
      throw new BadRequestException(
        `Impossible de clôturer : ${rejectedSteps.length} étape(s) rejetée(s) ou annulée(s) en cascade — ` +
          `rejetez la procédure ou résolvez ces étapes`,
      );
    }

    const incompleteSteps = steps.filter(
      (s) => s.status !== StepStatus.COMPLETED,
    );
    if (incompleteSteps.length > 0) {
      throw new BadRequestException(
        `Impossible de clôturer : ${incompleteSteps.length} étape(s) non terminée(s)`,
      );
    }

    const { updated, notification } = await this.prisma.$transaction(
      async (tx) => {
        const result = await tx.procedure.update({
          where: { id: procedureId },
          data: { status: ProcedureStatus.COMPLETED },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.COMPLETE,
            entity: 'Procedure',
            entityId: procedureId,
            success: true,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            metadata: {},
          },
        });

        const newNotification =
          await this.notificationsService.createWithinTransaction(tx, {
            userId: result.studentId,
            type: 'PROCEDURE_COMPLETED',
            title: 'Procédure terminée',
            message: `Votre procédure ${result.numeroDossier} est terminée.`,
            entity: 'Procedure',
            entityId: result.id,
          });

        return { updated: result, notification: newNotification };
      },
    );

    await this.notifyCompleted(updated, notification);

    return this.toResponseDto(await this.loadWithRelations(procedureId));
  }

  async reject(
    procedureId: string,
    actorId: string,
    actorRole: UserRole,
    dto: RejectProcedureDto,
    context: ProcedureDeviceContext,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.findAccessibleOrThrow(
      procedureId,
      actorId,
      actorRole,
    );

    this.assertNotTerminal(procedure);

    if (actorRole === UserRole.ETUDIANT) {
      throw new ForbiddenException(
        'Seul le consultant affecté ou un administrateur peut rejeter une procédure',
      );
    }

    const { updated, notification } = await this.prisma.$transaction(
      async (tx) => {
        const result = await tx.procedure.update({
          where: { id: procedureId },
          data: {
            status: ProcedureStatus.REJECTED,
            cancellationReason: dto.reason,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.CANCEL,
            entity: 'Procedure',
            entityId: procedureId,
            success: true,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            metadata: { reason: dto.reason },
          },
        });

        const newNotification =
          await this.notificationsService.createWithinTransaction(tx, {
            userId: result.studentId,
            type: 'PROCEDURE_REJECTED',
            title: 'Procédure rejetée',
            message: `Votre procédure ${result.numeroDossier} a été rejetée.`,
            entity: 'Procedure',
            entityId: result.id,
          });

        return { updated: result, notification: newNotification };
      },
    );

    await this.notifyRejected(updated, notification, dto.reason);

    return this.toResponseDto(await this.loadWithRelations(procedureId));
  }

  async cancel(
    procedureId: string,
    actorId: string,
    actorRole: UserRole,
    dto: CancelProcedureDto,
    context: ProcedureDeviceContext,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.findAccessibleOrThrow(
      procedureId,
      actorId,
      actorRole,
    );

    this.assertNotTerminal(procedure);

    if (actorRole === UserRole.ETUDIANT && procedure.studentId !== actorId) {
      throw new ForbiddenException(
        "Vous n'êtes pas l'étudiant concerné par cette procédure",
      );
    }

    if (actorRole === UserRole.CONSULTANT) {
      throw new ForbiddenException(
        'Un consultant ne peut pas annuler une procédure — utilisez le rejet si nécessaire',
      );
    }

    const lockKey = `lock:procedure:${procedureId}:cancellation`;

    const { updated, cascadedStepIds, cancelledMeetingIds, notification } =
      await this.lockingService.withLock(
        lockKey,
        async () => {
          return this.prisma.$transaction(async (tx) => {
            const currentProcedure = await tx.procedure.findUnique({
              where: { id: procedureId },
            });

            if (
              !currentProcedure ||
              TERMINAL_PROCEDURE_STATUSES.includes(currentProcedure.status)
            ) {
              throw new BadRequestException(
                'Cette procédure a été modifiée entre-temps et ne peut plus être annulée',
              );
            }

            const result = await tx.procedure.update({
              where: { id: procedureId },
              data: {
                status: ProcedureStatus.CANCELLED,
                cancellationReason: dto.reason,
              },
            });

            const activeSteps = await tx.step.findMany({
              where: {
                procedureId,
                status: { in: CASCADE_ELIGIBLE_STATUSES },
              },
            });

            let cascadedStepIds: string[] = [];

            if (activeSteps.length > 0) {
              await tx.step.updateMany({
                where: { id: { in: activeSteps.map((s) => s.id) } },
                data: {
                  status: StepStatus.REJECTED,
                  rejectionReason: 'Procédure annulée',
                },
              });

              cascadedStepIds = activeSteps.map((s) => s.id);
            }

            const activeMeetings = await tx.followUpMeeting.findMany({
              where: {
                procedureId,
                status: {
                  in: [MeetingStatus.PENDING, MeetingStatus.CONFIRMED],
                },
              },
            });

            const cancelledMeetingIds: string[] = [];

            for (const meeting of activeMeetings) {
              await tx.followUpMeeting.update({
                where: { id: meeting.id },
                data: {
                  status: MeetingStatus.CANCELLED,
                  reason: 'Procédure annulée',
                },
              });

              await tx.consultantBooking.deleteMany({
                where: { followUpMeetingId: meeting.id },
              });

              cancelledMeetingIds.push(meeting.id);
            }

            await tx.auditLog.create({
              data: {
                userId: actorId,
                action: AuditAction.CANCEL,
                entity: 'Procedure',
                entityId: procedureId,
                success: true,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                metadata: {
                  reason: dto.reason,
                  cascadedStepIds,
                  cancelledMeetingIds,
                },
              },
            });

            const newNotification =
              await this.notificationsService.createWithinTransaction(tx, {
                userId: result.studentId,
                type: 'PROCEDURE_CANCELLED',
                title: 'Procédure annulée',
                message: `Votre procédure ${result.numeroDossier} a été annulée.`,
                entity: 'Procedure',
                entityId: result.id,
              });

            return {
              updated: result,
              cascadedStepIds,
              cancelledMeetingIds,
              notification: newNotification,
            };
          });
        },
        15000,
      );

    await this.notifyCancelled(
      updated,
      notification,
      cascadedStepIds.length,
      cancelledMeetingIds.length,
    );

    return this.toResponseDto(await this.loadWithRelations(procedureId));
  }

  async addComment(
    procedureId: string,
    actorId: string,
    actorRole: UserRole,
    dto: CreateCommentDto,
    context: ProcedureDeviceContext,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.findAccessibleOrThrow(
      procedureId,
      actorId,
      actorRole,
    );

    await this.prisma.$transaction(async (tx) => {
      const comment = await tx.procedureComment.create({
        data: { procedureId, authorId: actorId, content: dto.content },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.CREATE,
          entity: 'ProcedureComment',
          entityId: comment.id,
          success: true,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { procedureId },
        },
      });

      return comment;
    });

    return this.toResponseDto(await this.loadWithRelations(procedureId));
  }

  async deleteComment(
    procedureId: string,
    commentId: string,
    actorId: string,
    actorRole: UserRole,
    context: ProcedureDeviceContext,
  ): Promise<void> {
    const procedure = await this.findAccessibleOrThrow(
      procedureId,
      actorId,
      actorRole,
    );

    const comment = await this.prisma.procedureComment.findFirst({
      where: { id: commentId, procedureId },
    });

    if (!comment) {
      throw new NotFoundException(`Commentaire #${commentId} introuvable`);
    }

    if (actorRole !== UserRole.ADMIN && comment.authorId !== actorId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres commentaires',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.procedureComment.delete({ where: { id: commentId } });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.DELETE,
          entity: 'ProcedureComment',
          entityId: commentId,
          success: true,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { procedureId },
        },
      });
    });
  }

  async findOne(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.findAccessibleOrThrow(id, actorId, actorRole);
    return this.toResponseDto(await this.loadWithRelations(procedure.id));
  }

  async findByNumeroDossier(
    numeroDossier: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<ProcedureResponseDto> {
    const procedure = await this.prisma.procedure.findUnique({
      where: { numeroDossier },
    });

    if (!procedure) {
      throw new NotFoundException(`Dossier ${numeroDossier} introuvable`);
    }

    const accessible = await this.findAccessibleOrThrow(
      procedure.id,
      actorId,
      actorRole,
    );
    return this.toResponseDto(await this.loadWithRelations(accessible.id));
  }

  async findAllForStudent(studentId: string): Promise<ProcedureResponseDto[]> {
    const list = await this.prisma.procedure.findMany({
      where: { studentId },
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((p) => this.toResponseDto(p));
  }

  async findAllForConsultant(
    consultantId: string,
  ): Promise<ProcedureResponseDto[]> {
    const list = await this.prisma.procedure.findMany({
      where: { consultantId },
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((p) => this.toResponseDto(p));
  }

  async findAllForAdmin(): Promise<ProcedureResponseDto[]> {
    const list = await this.prisma.procedure.findMany({
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((p) => this.toResponseDto(p));
  }

  private async findAccessibleOrThrow(
    id: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<Procedure> {
    const procedure = await this.prisma.procedure.findUnique({ where: { id } });

    if (!procedure) {
      throw new NotFoundException(`Procédure #${id} introuvable`);
    }

    if (actorRole === UserRole.ADMIN) {
      return procedure;
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

    return procedure;
  }

  private assertNotTerminal(procedure: Procedure): void {
    if (TERMINAL_PROCEDURE_STATUSES.includes(procedure.status)) {
      const label =
        procedure.status === ProcedureStatus.COMPLETED
          ? 'terminée'
          : procedure.status === ProcedureStatus.REJECTED
            ? 'rejetée'
            : 'annulée';
      throw new BadRequestException(
        `Cette procédure est ${label} et ne peut plus être modifiée`,
      );
    }
  }

  private async loadWithRelations(id: string) {
    const procedure = await this.prisma.procedure.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!procedure) {
      throw new NotFoundException(`Procédure #${id} introuvable`);
    }

    return procedure;
  }

  private toResponseDto(
    procedure: Procedure & { steps?: Step[]; comments?: ProcedureComment[] },
  ): ProcedureResponseDto {
    return {
      id: procedure.id,
      numeroDossier: procedure.numeroDossier,
      rendezVousId: procedure.rendezVousId,
      studentId: procedure.studentId,
      consultantId: procedure.consultantId,
      destinationId: procedure.destinationId,
      status: procedure.status,
      cancellationReason: procedure.cancellationReason,
      createdAt: procedure.createdAt,
      updatedAt: procedure.updatedAt,
      steps: procedure.steps?.map((s) => ({
        id: s.id,
        stepName: s.stepName,
        orderIndex: s.orderIndex,
        status: s.status,
        rejectionReason: s.rejectionReason,
        cascadeCancelledFromStepId: s.cascadeCancelledFromStepId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      comments: procedure.comments?.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  private async notifyCreated(
    procedure: Procedure,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const [student, destination] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: procedure.studentId } }),
      this.prisma.destination.findUnique({
        where: { id: procedure.destinationId },
      }),
    ]);

    this.procedureGateway.notifyProcedureCreated(procedure);
    await this.notificationsService.pushPostCommit(notification);

    if (!student || !destination) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre procédure a été ouverte',
      template: 'procedure/procedure-created',
      context: {
        destination: destination.country,
        numeroDossier: procedure.numeroDossier,
        dateCreation: procedure.createdAt.toLocaleDateString('fr-FR'),
      },
    });
  }

  private async notifyStepCompleted(
    procedure: Procedure,
    step: Step,
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: procedure.studentId },
    });

    this.procedureGateway.notifyStepUpdated(procedure, step);

    if (!student) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Une étape de votre procédure a été validée',
      template: 'procedure/procedure-step-completed',
      context: {
        etapeNom: step.stepName,
        numeroDossier: procedure.numeroDossier,
        date: new Date().toLocaleDateString('fr-FR'),
      },
    });
  }

  private async notifyStepRejected(
    procedure: Procedure,
    step: Step,
    reason: string,
    cascadedStepIds: string[],
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: procedure.studentId },
    });

    this.procedureGateway.notifyStepUpdated(procedure, step);

    if (cascadedStepIds.length > 0) {
      this.procedureGateway.notifyStepsCascadedRejection(
        procedure,
        cascadedStepIds,
      );
    }

    if (!student) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Une étape de votre procédure nécessite votre attention',
      template: 'procedure/procedure-step-rejected',
      context: {
        etapeNom: step.stepName,
        numeroDossier: procedure.numeroDossier,
        motif: reason,
        etapesAnnuleesCount: cascadedStepIds.length,
      },
    });
  }

  private async notifyCompleted(
    procedure: Procedure,
    notification: { id: string; userId: string },
  ): Promise<void> {
    const [student, destination] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: procedure.studentId } }),
      this.prisma.destination.findUnique({
        where: { id: procedure.destinationId },
      }),
    ]);

    this.procedureGateway.notifyProcedureCompleted(procedure);
    await this.notificationsService.pushPostCommit(notification);

    if (!student || !destination) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre procédure est terminée',
      template: 'procedure/procedure-completed',
      context: {
        destination: destination.country,
        numeroDossier: procedure.numeroDossier,
        dateCloture: new Date().toLocaleDateString('fr-FR'),
      },
    });
  }

  private async notifyRejected(
    procedure: Procedure,
    notification: { id: string; userId: string },
    reason: string,
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: procedure.studentId },
    });

    this.procedureGateway.notifyProcedureRejected(procedure);
    await this.notificationsService.pushPostCommit(notification);

    if (!student) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre procédure a été rejetée',
      template: 'procedure/procedure-rejected',
      context: { motif: reason, date: new Date().toLocaleDateString('fr-FR') },
    });
  }

  private async notifyCancelled(
    procedure: Procedure,
    notification: { id: string; userId: string },
    cascadedStepsCount: number,
    cancelledMeetingsCount: number,
  ): Promise<void> {
    const student = await this.prisma.user.findUnique({
      where: { id: procedure.studentId },
    });

    this.procedureGateway.notifyProcedureCancelled(procedure);
    await this.notificationsService.pushPostCommit(notification);

    if (!student) return;

    await this.emailQueueService.send({
      to: student.email,
      subject: 'Votre procédure a été annulée',
      template: 'procedure/procedure-cancelled',
      context: {
        motif: procedure.cancellationReason ?? 'Non précisé',
        date: new Date().toLocaleDateString('fr-FR'),
        etapesAnnuleesCount: cascadedStepsCount,
        rendezVousSuiviAnnulesCount: cancelledMeetingsCount,
      },
    });
  }
}
