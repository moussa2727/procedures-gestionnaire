import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AbsenceType, ConsultantUnavailability } from '@prisma/client';

@Injectable()
export class ConsultantUnavailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    consultantId: string,
    startDate: Date,
    endDate: Date,
    type: AbsenceType,
    createdBy: string,
    reason?: string,
  ): Promise<ConsultantUnavailability> {
    return this.prisma.consultantUnavailability.create({
      data: {
        consultantId,
        startDate: this.startOfDay(startDate),
        endDate: this.startOfDay(endDate),
        type,
        reason,
        createdBy,
      },
    });
  }

  async findById(id: string): Promise<ConsultantUnavailability | null> {
    return this.prisma.consultantUnavailability.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.consultantUnavailability.delete({ where: { id } });
  }

  async findOverlapping(
    consultantId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<ConsultantUnavailability[]> {
    return this.prisma.consultantUnavailability.findMany({
      where: {
        consultantId,
        id: excludeId ? { not: excludeId } : undefined,
        startDate: { lte: this.startOfDay(endDate) },
        endDate: { gte: this.startOfDay(startDate) },
      },
    });
  }

  async isConsultantAbsentOnDate(
    consultantId: string,
    date: Date,
  ): Promise<boolean> {
    const day = this.startOfDay(date);
    const count = await this.prisma.consultantUnavailability.count({
      where: { consultantId, startDate: { lte: day }, endDate: { gte: day } },
    });
    return count > 0;
  }

  async findForConsultantInRange(
    consultantId: string,
    start: Date,
    end: Date,
  ): Promise<ConsultantUnavailability[]> {
    return this.prisma.consultantUnavailability.findMany({
      where: {
        consultantId,
        startDate: { lte: this.startOfDay(end) },
        endDate: { gte: this.startOfDay(start) },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findAllForConsultant(
    consultantId: string,
  ): Promise<ConsultantUnavailability[]> {
    return this.prisma.consultantUnavailability.findMany({
      where: { consultantId },
      orderBy: { startDate: 'desc' },
    });
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
