// users/users.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { AvailabilityService } from '@/availability/availability.service';
import { SessionService } from '@/auth/session.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { UsersGateway } from './users.gateway';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import {
  ConsultantPublicProfile,
  ConsultantSemiPublicProfile,
  ConsultantDestinationPublic,
  ConsultantStatsPublic,
  ConsultantAvailabilityPublic,
  ConsultantReviewPublic,
} from './interfaces/consultant-public-profile.interface';
import { UserStatistics } from './interfaces/user-statistics.interface';
import {
  CONSULTANT_AVAILABILITY_DAYS_AHEAD,
  MIN_RATING_REQUIRING_COMMENT,
  USER_CACHE_KEYS,
  USER_STATS_CACHE_TTL,
  USER_PROFILE_CACHE_TTL,
} from './users.constants';
import {
  AuditAction,
  MeetingStatus,
  ProcedureStatus,
  RendezvousStatus,
  RevocationReason,
  TimeSlot,
  User,
  UserRole,
} from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailQueueService: EmailQueueService,
    private readonly availabilityService: AvailabilityService,
    private readonly sessionService: SessionService,
    private readonly notificationsService: NotificationsService,
    private readonly usersGateway: UsersGateway,
  ) {}

  async findAll(query: UsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      isDeleted: query.isDeleted ?? false,
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' as const } },
          {
            firstName: { contains: query.search, mode: 'insensitive' as const },
          },
          {
            lastName: { contains: query.search, mode: 'insensitive' as const },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.toResponseDto(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneWithDetails(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(
        `Utilisateur #${this.maskId(id)} introuvable`,
      );
    }

    return this.toResponseDto(user);
  }

  async findByRole(role: UserRole) {
    const users = await this.prisma.user.findMany({
      where: { role, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toResponseDto(u));
  }

  async getLoginHistory(id: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.loginHistory.count({ where: { userId: id } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (dto.email === adminEmail) {
      throw new BadRequestException(
        'Cette adresse email est réservée au compte administrateur du système',
      );
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: dto.role,
          isActive: dto.isActive ?? true,
          photo: '',
          photoPublicId: '',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_CREATE',
          entity: 'User',
          entityId: newUser.id,
          success: true,
          metadata: { email: newUser.email, role: newUser.role },
        },
      });

      return newUser;
    });

    const template =
      dto.role === UserRole.CONSULTANT
        ? 'users/consultant-account-created'
        : 'users/welcome';

    await this.emailQueueService.send({
      to: user.email,
      subject:
        dto.role === UserRole.CONSULTANT
          ? 'Votre compte consultant est prêt'
          : 'Bienvenue',
      template,
      context: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        frontendUrl: this.configService.get<string>('FRONTEND_URL'),
      },
    });

    return this.toResponseDto(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.findExistingOrThrow(id);

    if (existing.role === UserRole.ADMIN && actorId !== id) {
      throw new ForbiddenException(
        'Le compte administrateur ne peut pas être modifié via cette route',
      );
    }

    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (conflict) {
        throw new ConflictException('Cet email est déjà utilisé');
      }

      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      if (dto.email === adminEmail) {
        throw new BadRequestException(
          'Cette adresse email est réservée au compte administrateur',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const userUpdateData: any = {};
      if (dto.email !== undefined) userUpdateData.email = dto.email;
      if (dto.firstName !== undefined) userUpdateData.firstName = dto.firstName;
      if (dto.lastName !== undefined) userUpdateData.lastName = dto.lastName;
      if (dto.phone !== undefined) userUpdateData.phone = dto.phone;
      if (dto.isActive !== undefined) userUpdateData.isActive = dto.isActive;

      const result = await tx.user.update({
        where: { id },
        data: userUpdateData,
      });

      // Propagate denormalized contact fields to related tables (rendez-vous)
      const rendezvousUpdateData: any = {};
      if (dto.firstName !== undefined)
        rendezvousUpdateData.firstName = dto.firstName;
      if (dto.lastName !== undefined)
        rendezvousUpdateData.lastName = dto.lastName;
      if (dto.email !== undefined) rendezvousUpdateData.email = dto.email;
      if (dto.phone !== undefined) rendezvousUpdateData.phone = dto.phone;

      if (Object.keys(rendezvousUpdateData).length > 0) {
        await tx.rendezVous.updateMany({
          where: { studentId: id },
          data: rendezvousUpdateData,
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_UPDATE',
          entity: 'User',
          entityId: id,
          success: true,
          metadata: {
            changedFields: Object.keys(dto).filter(
              (key) => dto[key as keyof UpdateUserDto] !== undefined,
            ),
          },
        },
      });

      return result;
    });

    this.usersGateway.notifyUserUpdated(id, {
      firstName: updated.firstName,
      lastName: updated.lastName,
    });
    await this.invalidateProfileCache(id);

    return this.toResponseDto(updated);
  }

  async promoteToConsultant(id: string, actorId: string) {
    const existing = await this.findExistingOrThrow(id);

    if (existing.role !== UserRole.ETUDIANT) {
      throw new BadRequestException(
        'Seul un compte étudiant peut être promu consultant',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { role: UserRole.CONSULTANT },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_PROMOTED_TO_CONSULTANT',
          entity: 'User',
          entityId: id,
          success: true,
          metadata: { previousRole: UserRole.ETUDIANT },
        },
      });

      await this.notificationsService.createWithinTransaction(tx, {
        userId: id,
        type: 'ACCOUNT_PROMOTED',
        title: 'Votre compte a été promu consultant',
        message: 'Vous disposez désormais des fonctionnalités consultant.',
        entity: 'User',
        entityId: id,
      });

      return result;
    });

    await this.invalidateProfileCache(id);
    this.usersGateway.notifyUserUpdated(id, { role: updated.role });

    return this.toResponseDto(updated);
  }

  async toggleStatus(id: string, isActive: boolean, actorId: string) {
    const existing = await this.findExistingOrThrow(id);

    if (existing.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Le compte administrateur ne peut pas être désactivé',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { isActive },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_STATUS_TOGGLE',
          entity: 'User',
          entityId: id,
          success: true,
          metadata: { isActive },
        },
      });

      return result;
    });

    if (!isActive) {
      await this.sessionService.deactivateAllForUser(
        id,
        RevocationReason.ADMIN_REVOKE,
      );
    }

    await this.invalidateProfileCache(id);
    return this.toResponseDto(updated);
  }

  async restore(id: string, actorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, isDeleted: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Utilisateur supprimé #${this.maskId(id)} introuvable`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_RESTORE',
          entity: 'User',
          entityId: id,
          success: true,
          metadata: {},
        },
      });

      return result;
    });

    await this.invalidateProfileCache(id);
    return this.toResponseDto(updated);
  }

  async resetUserPassword(id: string, newPassword: string, actorId: string) {
    const existing = await this.findExistingOrThrow(id);

    if (existing.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Le mot de passe du compte administrateur ne peut pas être réinitialisé par cette route',
      );
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_PASSWORD_RESET_BY_ADMIN',
          entity: 'User',
          entityId: id,
          success: true,
          metadata: {},
        },
      });
    });

    await this.sessionService.deactivateAllForUser(
      id,
      RevocationReason.PASSWORD_CHANGED,
    );

    await this.emailQueueService.send({
      to: existing.email,
      subject: 'Votre mot de passe a été modifié',
      template: 'auth/password-changed',
      context: {
        firstName: existing.firstName,
        date: new Date().toLocaleString('fr-FR'),
      },
    });
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findExistingOrThrow(id);

    if (existing.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Le compte administrateur ne peut pas être supprimé',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'USER_SOFT_DELETE',
          entity: 'User',
          entityId: id,
          success: true,
          metadata: {},
        },
      });
    });

    await this.sessionService.deactivateAllForUser(
      id,
      RevocationReason.ADMIN_REVOKE,
    );
    await this.invalidateProfileCache(id);
  }

  async logoutAllUsers(
    actorId: string,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const targets = await this.prisma.user.findMany({
      where: {
        id: { not: actorId },
        role: { not: UserRole.ADMIN },
        isDeleted: false,
      },
      select: { id: true },
    });

    let count = 0;

    for (const target of targets) {
      const revoked = await this.sessionService.deactivateAllForUser(
        target.id,
        RevocationReason.ADMIN_REVOKE,
      );
      if (revoked > 0) count++;

      await this.notificationsService.create({
        userId: target.id,
        type: 'SYSTEM',
        title: 'Déconnexion forcée',
        message: 'Vous avez été déconnecté par un administrateur.',
      });

      this.usersGateway.notifyUserUpdated(target.id, { forceLogout: true });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'LOGOUT_ALL_USERS',
        entity: 'User',
        entityId: null,
        success: true,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { affectedUsersCount: count },
      },
    });

    return { affectedUsersCount: count };
  }

  async listMySessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionService.findActiveByUserId(userId);

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeMySession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable ou déjà inactive');
    }

    if (sessionId === currentSessionId) {
      throw new BadRequestException(
        'Impossible de révoquer votre session actuelle depuis cet endpoint utilisez la déconnexion standard',
      );
    }

    await this.sessionService.deactivate(
      sessionId,
      RevocationReason.MANUAL_REVOKE,
    );

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_SESSION_REVOKED',
        entity: 'Session',
        entityId: sessionId,
        success: true,
        metadata: {},
      },
    });
  }

  async adminRevokeUserSession(
    targetUserId: string,
    sessionId: string,
    actorId: string,
  ): Promise<void> {
    const target = await this.findExistingOrThrow(targetUserId);

    if (target.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Impossible de révoquer une session du compte administrateur',
      );
    }

    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: targetUserId, isActive: true },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable ou déjà inactive');
    }

    await this.sessionService.deactivate(
      sessionId,
      RevocationReason.ADMIN_REVOKE,
    );

    await this.notificationsService.create({
      userId: targetUserId,
      type: 'SESSION_REVOKED',
      title: 'Une de vos sessions a été révoquée',
      message: "Un administrateur a mis fin à l'une de vos connexions actives.",
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_SESSION_REVOKED',
        entity: 'Session',
        entityId: sessionId,
        success: true,
        metadata: { targetUserId },
      },
    });
  }

  async getStatistics(): Promise<UserStatistics> {
    const client = this.redisService.getClient();
    const cached = await client.get(USER_CACHE_KEYS.STATS);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        this.logger.warn('Cache stats utilisateurs corrompu, recalcul');
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      total,
      admins,
      consultants,
      students,
      active,
      inactive,
      online,
      newThisMonth,
      newThisWeek,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.user.count({
        where: { role: UserRole.ADMIN, isDeleted: false },
      }),
      this.prisma.user.count({
        where: { role: UserRole.CONSULTANT, isDeleted: false },
      }),
      this.prisma.user.count({
        where: { role: UserRole.ETUDIANT, isDeleted: false },
      }),
      this.prisma.user.count({ where: { isActive: true, isDeleted: false } }),
      this.prisma.user.count({ where: { isActive: false, isDeleted: false } }),
      this.prisma.user.count({ where: { isOnline: true, isDeleted: false } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfMonth }, isDeleted: false },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfWeek }, isDeleted: false },
      }),
    ]);

    const stats: UserStatistics = {
      total,
      byRole: { ETUDIANT: students, CONSULTANT: consultants, ADMIN: admins },
      active,
      inactive,
      online,
      newThisMonth,
      newThisWeek,
      generatedAt: now.toISOString(),
    };

    await client.set(
      USER_CACHE_KEYS.STATS,
      JSON.stringify(stats),
      'EX',
      USER_STATS_CACHE_TTL,
    );

    return stats;
  }

  async getProfile(userId: string) {
    const user = await this.findExistingOrThrow(userId);
    return this.toResponseDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.findExistingOrThrow(userId);

    if (dto.email && dto.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (conflict) {
        throw new ConflictException(
          'Cet email est déjà utilisé par un autre compte',
        );
      }

      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      if (dto.email === adminEmail) {
        throw new BadRequestException(
          'Cette adresse email est réservée au compte administrateur',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });

    await this.invalidateProfileCache(userId);

    if (updated.role === UserRole.CONSULTANT) {
      await this.invalidatePublicProfileCache(userId);
    }

    this.usersGateway.notifyUserUpdated(userId, {
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
    });

    return this.toResponseDto(updated);
  }

  async updatePhoto(userId: string, file: Express.Multer.File) {
    const existing = await this.findExistingOrThrow(userId);

    if (existing.photoPublicId) {
      await this.cloudinaryService.deleteFile(existing.photoPublicId);
    }

    const uploadResult = await this.cloudinaryService.uploadFile(file, 'users');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: userId },
        data: { photo: uploadResult.url, photoPublicId: uploadResult.publicId },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'USER_PHOTO_UPDATED',
          entity: 'User',
          entityId: userId,
          success: true,
          metadata: {},
        },
      });

      return result;
    });

    await this.invalidateProfileCache(userId);
    await this.invalidatePublicProfileCache(userId);

    return this.toResponseDto(updated);
  }

  async getConsultantProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, role: UserRole.CONSULTANT, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('Profil consultant introuvable');
    }

    return this.toResponseDto(user);
  }

  async listConsultantsSemiPublic(): Promise<ConsultantSemiPublicProfile[]> {
    const consultants = await this.prisma.user.findMany({
      where: { role: UserRole.CONSULTANT, isDeleted: false, isActive: true },
      select: { id: true, firstName: true, lastName: true, photo: true },
      orderBy: { firstName: 'asc' },
    });

    return consultants;
  }

  async getConsultantPublicProfile(
    id: string,
  ): Promise<ConsultantPublicProfile> {
    const cacheKey = USER_CACHE_KEYS.PUBLIC_PROFILE(id);
    const client = this.redisService.getClient();
    const cached = await client.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        this.logger.warn(
          `Cache profil public ${this.maskId(id)} corrompu, reconstruction`,
        );
      }
    }

    const consultant = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.CONSULTANT,
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photo: true,
      },
    });

    if (!consultant) {
      throw new NotFoundException('Consultant introuvable ou inactif');
    }

    const assignments = await this.prisma.consultantDestination.findMany({
      where: { consultantId: id, destination: { isDeleted: false } },
      select: {
        destination: {
          select: {
            id: true,
            country: true,
          },
        },
      },
    });

    const destinations: ConsultantDestinationPublic[] = assignments.map(
      (a) => ({
        id: a.destination.id,
        country: a.destination.country,
      }),
    );

    const destinationIds = assignments.map((a) => a.destination.id);
    const availability = await this.buildMergedAvailability(id, destinationIds);
    const stats = await this.computeConsultantStatsLight(id);

    const reviews = await this.prisma.consultantReview.findMany({
      where: { consultantId: id },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        moderatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const profile: ConsultantPublicProfile = {
      id: consultant.id,
      firstName: consultant.firstName,
      lastName: consultant.lastName,
      photo: consultant.photo || '',
      destinations,
      availability,
      stats,
      reviews: reviews.map((r): ConsultantReviewPublic => ({
        id: r.id,
        rating: r.rating,
        comment: r.moderatedAt ? null : (r.comment ?? null),
        createdAt: r.createdAt,
      })),
    };

    await client.set(
      cacheKey,
      JSON.stringify(profile),
      'EX',
      USER_PROFILE_CACHE_TTL,
    );

    return profile;
  }

  private async buildMergedAvailability(
    consultantId: string,
    destinationIds: string[],
  ): Promise<ConsultantAvailabilityPublic[]> {
    const availability: ConsultantAvailabilityPublic[] = [];

    for (
      let offset = 0;
      offset < CONSULTANT_AVAILABILITY_DAYS_AHEAD;
      offset++
    ) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      date.setHours(0, 0, 0, 0);

      if (
        this.availabilityService.isWeekend(date) ||
        this.availabilityService.getHolidayName(date)
      ) {
        continue;
      }

      const slotSets = await Promise.all(
        destinationIds.map((destinationId) =>
          this.availabilityService.getAvailableSlotsForDay({
            consultantId,
            destinationId,
            date,
          }),
        ),
      );

      const union = new Set<TimeSlot>();
      for (const slots of slotSets) {
        for (const slot of slots) {
          union.add(slot);
        }
      }

      if (union.size > 0) {
        availability.push({
          date: date.toISOString().slice(0, 10),
          availableSlots: Array.from(union),
        });
      }
    }

    return availability;
  }

  private async computeConsultantStatsLight(
    consultantId: string,
  ): Promise<ConsultantStatsPublic> {
    const now = new Date();

    const [rendezVousCount, meetingCount, reviews] = await Promise.all([
      this.prisma.rendezVous.count({
        where: {
          consultantId,
          date: { lte: now },
          status: { not: RendezvousStatus.CANCELLED },
        },
      }),
      this.prisma.followUpMeeting.count({
        where: {
          consultantId,
          date: { lte: now },
          status: { not: MeetingStatus.CANCELLED },
        },
      }),
      this.prisma.consultantReview.findMany({
        where: { consultantId },
        select: { rating: true },
      }),
    ]);

    const totalAppointments = rendezVousCount + meetingCount;
    const totalReviews = reviews.length;
    const rating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10,
          ) / 10
        : 0;

    return { totalAppointments, rating, totalReviews };
  }

  async getConsultantStudents(consultantId: string) {
    const consultant = await this.prisma.user.findFirst({
      where: { id: consultantId, role: UserRole.CONSULTANT, isDeleted: false },
    });

    if (!consultant) {
      throw new NotFoundException('Consultant introuvable');
    }

    const [fromRendezVous, fromProcedures, fromMeetings] = await Promise.all([
      this.prisma.rendezVous.findMany({
        where: { consultantId },
        distinct: ['studentId'],
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photo: true,
            },
          },
        },
      }),
      this.prisma.procedure.findMany({
        where: { consultantId },
        distinct: ['studentId'],
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photo: true,
            },
          },
        },
      }),
      this.prisma.followUpMeeting.findMany({
        where: { consultantId },
        distinct: ['studentId'],
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              photo: true,
            },
          },
        },
      }),
    ]);

    const map = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        photo: string;
      }
    >();

    for (const source of [fromRendezVous, fromProcedures, fromMeetings]) {
      for (const entry of source) {
        map.set(entry.student.id, entry.student);
      }
    }

    return Array.from(map.values());
  }

  async createReview(
    studentId: string,
    consultantId: string,
    dto: CreateReviewDto,
  ) {
    const consultant = await this.prisma.user.findFirst({
      where: { id: consultantId, role: UserRole.CONSULTANT, isDeleted: false },
    });

    if (!consultant) {
      throw new NotFoundException('Consultant introuvable');
    }

    const isEligible = await this.isStudentEligibleToReview(
      studentId,
      consultantId,
    );

    if (!isEligible) {
      throw new ForbiddenException(
        "Vous ne pouvez évaluer ce consultant qu'après un rendez-vous, une procédure ou un rendez-vous de suivi terminé",
      );
    }

    if (dto.rating <= MIN_RATING_REQUIRING_COMMENT && !dto.comment) {
      throw new BadRequestException(
        'Un commentaire est obligatoire pour une évaluation de 2 étoiles ou moins',
      );
    }

    const alreadyReviewed = await this.prisma.consultantReview.findUnique({
      where: { studentId_consultantId: { studentId, consultantId } },
    });

    if (alreadyReviewed) {
      throw new ConflictException('Vous avez déjà évalué ce consultant');
    }

    const { review, notification } = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.consultantReview.create({
          data: {
            studentId,
            consultantId,
            rating: dto.rating,
            comment: dto.comment,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: studentId,
            action: 'REVIEW_CREATED',
            entity: 'ConsultantReview',
            entityId: created.id,
            success: true,
            metadata: { consultantId, rating: dto.rating },
          },
        });

        const newNotification =
          await this.notificationsService.createWithinTransaction(tx, {
            userId: consultantId,
            type: 'REVIEW_RECEIVED',
            title: 'Nouvelle évaluation reçue',
            message: `Vous avez reçu une évaluation de ${dto.rating}/5.`,
            entity: 'ConsultantReview',
            entityId: created.id,
          });

        return { review: created, notification: newNotification };
      },
    );

    await this.notificationsService.pushPostCommit(notification);
    await this.invalidatePublicProfileCache(consultantId);

    return review;
  }

  private async isStudentEligibleToReview(
    studentId: string,
    consultantId: string,
  ): Promise<boolean> {
    const [rendezVous, procedure, meeting] = await Promise.all([
      this.prisma.rendezVous.findFirst({
        where: { studentId, consultantId, status: RendezvousStatus.COMPLETED },
      }),
      this.prisma.procedure.findFirst({
        where: { studentId, consultantId, status: ProcedureStatus.COMPLETED },
      }),
      this.prisma.followUpMeeting.findFirst({
        where: { studentId, consultantId, status: MeetingStatus.COMPLETED },
      }),
    ]);

    return !!(rendezVous || procedure || meeting);
  }

  async respondToReview(
    consultantId: string,
    reviewId: string,
    dto: RespondReviewDto,
  ) {
    const review = await this.prisma.consultantReview.findUnique({
      where: { id: reviewId },
      include: { response: true },
    });

    if (!review) {
      throw new NotFoundException(
        `Évaluation #${this.maskId(reviewId)} introuvable`,
      );
    }

    if (review.consultantId !== consultantId) {
      throw new ForbiddenException(
        "Vous ne pouvez répondre qu'aux évaluations qui vous concernent",
      );
    }

    if (review.response) {
      throw new ConflictException('Vous avez déjà répondu à cette évaluation');
    }

    const { response, notification } = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.consultantReviewResponse.create({
          data: { reviewId, consultantId, response: dto.response },
        });

        await tx.auditLog.create({
          data: {
            userId: consultantId,
            action: 'REVIEW_RESPONSE_CREATED',
            entity: 'ConsultantReviewResponse',
            entityId: created.id,
            success: true,
            metadata: { reviewId },
          },
        });

        const newNotification =
          await this.notificationsService.createWithinTransaction(tx, {
            userId: review.studentId,
            type: 'REVIEW_RESPONSE',
            title: 'Le consultant a répondu à votre évaluation',
            message: dto.response.slice(0, 140),
            entity: 'ConsultantReview',
            entityId: reviewId,
          });

        return { response: created, notification: newNotification };
      },
    );

    await this.notificationsService.pushPostCommit(notification);
    await this.invalidatePublicProfileCache(consultantId);

    return response;
  }

  async moderateReviewComment(
    reviewId: string,
    actorId: string,
    dto: ModerateReviewDto,
  ) {
    const review = await this.prisma.consultantReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(
        `Évaluation #${this.maskId(reviewId)} introuvable`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.consultantReview.update({
        where: { id: reviewId },
        data: { moderatedAt: new Date(), moderationReason: dto.reason },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'REVIEW_COMMENT_MODERATED',
          entity: 'ConsultantReview',
          entityId: reviewId,
          success: true,
          metadata: { reason: dto.reason },
        },
      });

      return result;
    });

    await this.invalidatePublicProfileCache(review.consultantId);
    return updated;
  }

  private async findExistingOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(
        `Utilisateur #${this.maskId(id)} introuvable`,
      );
    }
    return user;
  }

  private async invalidateProfileCache(id: string): Promise<void> {
    await this.redisService.getClient().del(USER_CACHE_KEYS.PROFILE(id));
  }

  private async invalidatePublicProfileCache(id: string): Promise<void> {
    await this.redisService.getClient().del(USER_CACHE_KEYS.PUBLIC_PROFILE(id));
  }

  private toResponseDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? undefined,
      photo: user.photo,
      photoPublicId: user.photoPublicId || undefined,
      role: user.role,
      isActive: user.isActive,
      isDeleted: user.isDeleted,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Masque un identifiant pour les logs : seuls les 3 premiers et derniers caractères sont visibles
   */
  private maskId(id: string): string {
    if (!id || id.length <= 8) return '***';
    return `${id.substring(0, 3)}...${id.substring(id.length - 3)}`;
  }

  /**
   * Masque un email pour les logs : test@example.com → te***t@ex***e.com
   */
  private maskEmail(email: string): string {
    if (!email || email.length === 0) return '***';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [local, domain] = parts;
    if (local.length <= 2) {
      return `${local}@${this.maskDomain(domain)}`;
    }
    const maskedLocal =
      local.substring(0, 2) + '***' + local.substring(local.length - 1);
    return `${maskedLocal}@${this.maskDomain(domain)}`;
  }

  private maskDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length < 2) return '***';
    const tld = parts.pop();
    const domainName = parts.join('.');
    if (domainName.length <= 2) {
      return `${domainName}.${tld}`;
    }
    const masked =
      domainName.substring(0, 2) +
      '***' +
      domainName.substring(domainName.length - 1);
    return `${masked}.${tld}`;
  }
}
