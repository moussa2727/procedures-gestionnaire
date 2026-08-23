// consultant-destination.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class ConsultantDestinationService {
  private readonly logger = new Logger(ConsultantDestinationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assignConsultant(
    destinationId: string,
    consultantId: string,
    actorId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const destination = await tx.destination.findFirst({
        where: { id: destinationId, isDeleted: false },
      });
      if (!destination)
        throw new NotFoundException(
          `Destination #${destinationId} introuvable`,
        );

      const consultant = await tx.user.findFirst({
        where: {
          id: consultantId,
          role: UserRole.CONSULTANT,
          isDeleted: false,
          isActive: true,
        },
      });
      if (!consultant)
        throw new NotFoundException(
          `Consultant #${consultantId} introuvable, désactivé ou inactif`,
        );

      const exists = await tx.consultantDestination.findUnique({
        where: { consultantId_destinationId: { consultantId, destinationId } },
      });
      if (exists) return;

      await tx.consultantDestination.create({
        data: { consultantId, destinationId },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.CONSULTANT_ASSIGNED,
          entity: 'ConsultantDestination',
          entityId: `${consultantId}:${destinationId}`,
          success: true,
          metadata: {
            destinationId,
            destinationCountry: destination.country,
            consultantId,
            consultantEmail: consultant.email,
          },
        },
      });
    });

    this.logger.log(
      `Destination ${destinationId} affectée au consultant ${consultantId}`,
    );
  }

  async removeAssignment(
    destinationId: string,
    consultantId: string,
    actorId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "destinations" WHERE id = ${destinationId} FOR UPDATE
      `;
      if (locked.length === 0)
        throw new NotFoundException(
          `Destination #${destinationId} introuvable`,
        );

      const exists = await tx.consultantDestination.findUnique({
        where: { consultantId_destinationId: { consultantId, destinationId } },
      });
      if (!exists) throw new NotFoundException('Affectation introuvable');

      const consultantCount = await tx.consultantDestination.count({
        where: { destinationId },
      });

      if (consultantCount <= 1) {
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.CONSULTANT_ASSIGNMENT_REJECTED,
            entity: 'ConsultantDestination',
            entityId: `${consultantId}:${destinationId}`,
            success: false,
            metadata: {
              destinationId,
              consultantId,
              reason: 'last_consultant_on_destination',
            },
          },
        });
        throw new BadRequestException(
          "Impossible de retirer le dernier consultant d'une destination",
        );
      }

      await tx.consultantDestination.delete({
        where: { consultantId_destinationId: { consultantId, destinationId } },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.CONSULTANT_UNASSIGNED,
          entity: 'ConsultantDestination',
          entityId: `${consultantId}:${destinationId}`,
          success: true,
          metadata: { destinationId, consultantId },
        },
      });
    });

    this.logger.log(
      `Consultant ${consultantId} retiré de la destination ${destinationId}`,
    );
  }

  async listByDestination(destinationId: string) {
    const destination = await this.prisma.destination.findFirst({
      where: { id: destinationId, isDeleted: false },
    });
    if (!destination)
      throw new NotFoundException(`Destination #${destinationId} introuvable`);

    return this.prisma.consultantDestination.findMany({
      where: { destinationId },
      include: {
        consultant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async listByConsultant(consultantId: string) {
    const consultant = await this.prisma.user.findFirst({
      where: { id: consultantId, role: UserRole.CONSULTANT, isDeleted: false },
    });
    if (!consultant)
      throw new NotFoundException(`Consultant #${consultantId} introuvable`);

    return this.prisma.consultantDestination.findMany({
      where: { consultantId },
      include: {
        destination: {
          select: {
            id: true,
            country: true,
            photo: true,
            description: true,
            isDeleted: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async listActiveConsultantIdsForDestination(
    destinationId: string,
  ): Promise<string[]> {
    const assignments = await this.prisma.consultantDestination.findMany({
      where: {
        destinationId,
        consultant: { isDeleted: false, isActive: true },
      },
      select: { consultantId: true },
    });
    return assignments.map((a) => a.consultantId);
  }

  async isConsultantAssignedToDestination(
    consultantId: string,
    destinationId: string,
  ): Promise<boolean> {
    const assignment = await this.prisma.consultantDestination.findUnique({
      where: { consultantId_destinationId: { consultantId, destinationId } },
    });
    return assignment !== null;
  }
}
