// destinations/destinations.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AuditAction,
  Destination,
  Prisma,
  ProcedureStatus,
  RendezvousStatus,
  UserRole,
} from '@prisma/client';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationResponseDto } from './dto/destination-response.dto';
import { DestinationGateway } from './destinations.gateway';
import { DestinationQueueService } from './jobs/services/destination-queue.service';

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class DestinationService implements OnModuleInit {
  private readonly logger = new Logger(DestinationService.name);
  private readonly CACHE_TTL = 86400;
  private readonly ALL_DESTINATIONS_CACHE_KEY = 'destinations:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly destinationGateway: DestinationGateway,
    private readonly redisService: RedisService,
    private readonly queueService: DestinationQueueService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.queueService.preloadCache();
  }

  async create(
    createDto: CreateDestinationDto,
    file: MulterFile,
    actorId: string,
  ): Promise<DestinationResponseDto> {
    if (!createDto.consultantIds || createDto.consultantIds.length === 0) {
      throw new BadRequestException(
        'Au moins un consultant doit être affecté à la destination',
      );
    }

    const existing = await this.prisma.destination.findUnique({
      where: { country: createDto.country },
    });
    if (existing)
      throw new ConflictException(`Le pays "${createDto.country}" existe déjà`);

    if (!file) {
      throw new BadRequestException('Une image est requise');
    }

    const uploadResult = await this.cloudinaryService.uploadFile(file as any);
    const photoUrl = uploadResult.url;
    const photoPublicId = uploadResult.publicId;
    const photoMetadata: Prisma.InputJsonValue = {
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    };

    const destination = await this.prisma.$transaction(async (tx) => {
      const consultants = await tx.user.findMany({
        where: {
          id: { in: createDto.consultantIds },
          role: UserRole.CONSULTANT,
          isDeleted: false,
          isActive: true,
        },
        select: { id: true },
      });

      if (consultants.length !== createDto.consultantIds.length) {
        throw new BadRequestException(
          'Un ou plusieurs consultants introuvables, désactivés ou invalides',
        );
      }

      const newDestination = await tx.destination.create({
        data: {
          country: createDto.country,
          description: createDto.description,
          photo: photoUrl,
          photoPublicId,
          photoMetadata,
        },
      });

      await tx.consultantDestination.createMany({
        data: createDto.consultantIds.map((consultantId) => ({
          consultantId,
          destinationId: newDestination.id,
        })),
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.DESTINATION_CREATE,
          entity: 'Destination',
          entityId: newDestination.id,
          success: true,
          metadata: {
            country: newDestination.country,
            consultantIds: createDto.consultantIds,
          },
        },
      });

      return newDestination;
    });

    const response = await this.toResponseDto(destination);
    this.destinationGateway.broadcastDestinationCreated(response);
    await this.invalidateAllCache();
    await this.queueService.updateStatistics();

    // Notification pour tous les administrateurs actifs
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, isDeleted: false },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'DESTINATION_CREATED',
          title: 'Destination créée',
          message: `La destination "${destination.country}" a été créée.`,
          entity: 'Destination',
          entityId: destination.id,
        });
      }
    } catch (notifError) {
      this.logger.warn(
        `Erreur lors de la création des notifications pour la destination ${destination.id}`,
        notifError,
      );
    }

    return response;
  }

  async findAll(): Promise<DestinationResponseDto[]> {
    const client = this.redisService.getClient();
    const cached = await client.get(this.ALL_DESTINATIONS_CACHE_KEY);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        this.logger.warn('Cache destinations:all corrompu, reconstruction');
      }
    }

    const destinations = await this.prisma.destination.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(
      destinations.map((d) => this.toResponseDto(d)),
    );

    await client.set(
      this.ALL_DESTINATIONS_CACHE_KEY,
      JSON.stringify(result),
      'EX',
      this.CACHE_TTL,
    );

    return result;
  }

  async findOne(id: string): Promise<DestinationResponseDto> {
    const cacheKey = this.singleCacheKey(id);
    const client = this.redisService.getClient();
    const cached = await client.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        this.logger.warn(`Cache ${cacheKey} corrompu, reconstruction`);
      }
    }

    const destination = await this.prisma.destination.findFirst({
      where: { id, isDeleted: false },
    });

    if (!destination) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }

    const result = await this.toResponseDto(destination);
    await client.set(cacheKey, JSON.stringify(result), 'EX', this.CACHE_TTL);
    return result;
  }

  async searchByCountry(query: string): Promise<DestinationResponseDto[]> {
    if (!query || query.trim() === '') return [];

    const destinations = await this.prisma.destination.findMany({
      where: {
        isDeleted: false,
        country: { contains: query, mode: 'insensitive' },
      },
      take: 10,
    });

    return Promise.all(destinations.map((d) => this.toResponseDto(d)));
  }

  async update(
    id: string,
    updateDto: UpdateDestinationDto,
    file: MulterFile | undefined,
    actorId: string,
  ): Promise<DestinationResponseDto> {
    const existing = await this.prisma.destination.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }

    let photoUrl = existing.photo;
    let photoPublicId = existing.photoPublicId;
    let photoMetadata: Prisma.InputJsonValue | undefined =
      existing.photoMetadata as Prisma.InputJsonValue | undefined;

    if (file) {
      if (existing.photoPublicId && !existing.photo.startsWith('/images/')) {
        await this.cloudinaryService.deleteFile(existing.photoPublicId);
      }

      const uploadResult = await this.cloudinaryService.uploadFile(file as any);
      photoUrl = uploadResult.url;
      photoPublicId = uploadResult.publicId;
      photoMetadata = {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      };
    }

    if (updateDto.country && updateDto.country !== existing.country) {
      const conflict = await this.prisma.destination.findFirst({
        where: {
          country: updateDto.country,
          isDeleted: false,
          id: { not: id },
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Le pays "${updateDto.country}" existe déjà`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.destination.update({
        where: { id },
        data: {
          country: updateDto.country ?? existing.country,
          description: updateDto.description ?? existing.description,
          photo: photoUrl,
          photoPublicId,
          photoMetadata: photoMetadata ?? Prisma.JsonNull,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.DESTINATION_UPDATE,
          entity: 'Destination',
          entityId: id,
          success: true,
          metadata: {
            changes: JSON.stringify(updateDto),
            photoChanged: !!file,
          },
        },
      });

      return result;
    });

    const response = await this.toResponseDto(updated);
    this.destinationGateway.broadcastDestinationUpdated(response);
    await this.invalidateAllCache();
    await this.invalidateSingleCache(id);
    await this.queueService.updateStatistics();

    // Notification pour tous les administrateurs actifs
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, isDeleted: false },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'DESTINATION_UPDATED',
          title: 'Destination mise à jour',
          message: `La destination "${updated.country}" a été mise à jour.`,
          entity: 'Destination',
          entityId: updated.id,
        });
      }
    } catch (notifError) {
      this.logger.warn(
        `Erreur lors de la création des notifications pour la destination ${updated.id}`,
        notifError,
      );
    }

    return response;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const destination = await this.prisma.destination.findFirst({
      where: { id, isDeleted: false },
    });

    if (!destination) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }

    await this.prisma.$transaction(async (tx) => {
      const activeProcedures = await tx.procedure.count({
        where: {
          destinationId: id,
          status: ProcedureStatus.IN_PROGRESS,
        },
      });

      if (activeProcedures > 0) {
        throw new BadRequestException(
          `Impossible de désactiver cette destination : ${activeProcedures} procédure(s) en cours`,
        );
      }

      const activeRendezVous = await tx.rendezVous.count({
        where: {
          destinationId: id,
          status: {
            in: [RendezvousStatus.PENDING, RendezvousStatus.CONFIRMED],
          },
        },
      });

      if (activeRendezVous > 0) {
        throw new BadRequestException(
          `Impossible de désactiver cette destination : ${activeRendezVous} rendez-vous actif(s)`,
        );
      }

      await tx.destination.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.DESTINATION_SOFT_DELETE,
          entity: 'Destination',
          entityId: id,
          success: true,
          metadata: {
            country: destination.country,
          },
        },
      });
    });

    this.destinationGateway.broadcastDestinationDeleted(id);
    await this.invalidateAllCache();
    await this.invalidateSingleCache(id);
    await this.queueService.updateStatistics();

    // Notification pour tous les administrateurs actifs
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, isDeleted: false },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'DESTINATION_SOFT_DELETED',
          title: 'Destination désactivée',
          message: `La destination "${destination.country}" a été désactivée.`,
          entity: 'Destination',
          entityId: destination.id,
        });
      }
    } catch (notifError) {
      this.logger.warn(
        `Erreur lors de la création des notifications pour la destination ${destination.id}`,
        notifError,
      );
    }
  }

  async restore(id: string, actorId: string): Promise<DestinationResponseDto> {
    const destination = await this.prisma.destination.findFirst({
      where: { id, isDeleted: true },
    });

    if (!destination) {
      throw new NotFoundException(`Destination désactivée #${id} non trouvée`);
    }

    const activeConsultants = await this.prisma.consultantDestination.count({
      where: {
        destinationId: id,
        consultant: { isDeleted: false, isActive: true },
      },
    });

    if (activeConsultants === 0) {
      throw new BadRequestException(
        'Impossible de restaurer une destination sans consultant actif — réaffectez au moins un consultant avant restauration',
      );
    }

    const restored = await this.prisma.$transaction(async (tx) => {
      const result = await tx.destination.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.DESTINATION_RESTORE,
          entity: 'Destination',
          entityId: id,
          success: true,
          metadata: {
            country: destination.country,
          },
        },
      });

      return result;
    });

    const response = await this.toResponseDto(restored);
    this.destinationGateway.broadcastDestinationUpdated(response);
    await this.invalidateAllCache();
    await this.invalidateSingleCache(id);
    await this.queueService.updateStatistics();

    // Notification pour tous les administrateurs actifs
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, isDeleted: false },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'DESTINATION_RESTORED',
          title: 'Destination restaurée',
          message: `La destination "${restored.country}" a été restaurée.`,
          entity: 'Destination',
          entityId: restored.id,
        });
      }
    } catch (notifError) {
      this.logger.warn(
        `Erreur lors de la création des notifications pour la destination ${restored.id}`,
        notifError,
      );
    }

    return response;
  }

  async hardDelete(id: string, actorId: string): Promise<void> {
    const destination = await this.prisma.destination.findUnique({
      where: { id },
    });

    if (!destination) {
      throw new NotFoundException(`Destination #${id} non trouvée`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (
          destination.photoPublicId &&
          !destination.photo.startsWith('/images/')
        ) {
          await this.cloudinaryService.deleteFile(destination.photoPublicId);
        }

        await tx.destination.delete({ where: { id } });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: AuditAction.DESTINATION_HARD_DELETE,
            entity: 'Destination',
            entityId: id,
            success: true,
            metadata: {
              country: destination.country,
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException(
          'Impossible de supprimer définitivement cette destination : des procédures ou rendez-vous y sont encore rattachés',
        );
      }
      throw error;
    }

    this.destinationGateway.broadcastDestinationDeleted(id);
    await this.invalidateAllCache();
    await this.invalidateSingleCache(id);
    await this.queueService.updateStatistics();

    // Notification pour tous les administrateurs actifs
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, isDeleted: false },
        select: { id: true },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'DESTINATION_HARD_DELETED',
          title: 'Destination supprimée définitivement',
          message: `La destination "${destination.country}" a été supprimée définitivement.`,
          entity: 'Destination',
          entityId: destination.id,
        });
      }
    } catch (notifError) {
      this.logger.warn(
        `Erreur lors de la création des notifications pour la destination ${destination.id}`,
        notifError,
      );
    }
  }

  async cleanupOrphanedImages(actorId: string): Promise<string[]> {
    const destinations = await this.prisma.destination.findMany({
      where: { isDeleted: false },
    });

    const validPublicIds = destinations
      .map((d) => d.photoPublicId)
      .filter(
        (id): id is string => !!id && id !== '' && !id.startsWith('/images/'),
      );

    const deletedFiles =
      await this.cloudinaryService.cleanupOrphanedFiles(validPublicIds);

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.DESTINATION_IMAGE_CLEANUP,
        entity: 'Destination',
        entityId: null,
        success: true,
        metadata: {
          deletedCount: deletedFiles.length,
          deletedFiles,
        },
      },
    });

    return deletedFiles;
  }

  private async invalidateAllCache(): Promise<void> {
    await this.redisService.getClient().del(this.ALL_DESTINATIONS_CACHE_KEY);
    this.logger.debug('Cache global "destinations:all" invalidé');
  }

  private async invalidateSingleCache(id: string): Promise<void> {
    await this.redisService.getClient().del(this.singleCacheKey(id));
    this.logger.debug(`Cache "destination:${id}" invalidé`);
  }

  private singleCacheKey(id: string): string {
    return `destination:${id}`;
  }

  private async toResponseDto(
    destination: Destination,
  ): Promise<DestinationResponseDto> {
    let imageUrl: string;

    if (destination.photo?.startsWith('/images/')) {
      imageUrl = destination.photo;
    } else if (destination.photo?.startsWith('http')) {
      imageUrl = destination.photo;
    } else if (destination.photoPublicId && destination.photoPublicId !== '') {
      imageUrl = this.cloudinaryService.getFileUrl(destination.photoPublicId);
    } else {
      imageUrl = '';
    }

    const activeConsultantsCount =
      await this.prisma.consultantDestination.count({
        where: {
          destinationId: destination.id,
          consultant: { isDeleted: false, isActive: true },
        },
      });

    return {
      id: destination.id,
      country: destination.country,
      description: destination.description,
      photo: imageUrl,
      photoPublicId: destination.photoPublicId || undefined,
      photoMetadata: destination.photoMetadata ?? undefined,
      createdAt: destination.createdAt,
      updatedAt: destination.updatedAt,
      isDeleted: destination.isDeleted,
      activeConsultantsCount,
    };
  }
}
