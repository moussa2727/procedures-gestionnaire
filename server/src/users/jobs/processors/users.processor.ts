// users/jobs/processors/users.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { USERS_JOB_TYPES, USERS_QUEUE } from '../users-job.constants';
import { USER_CACHE_KEYS } from '../../users.constants';
import { RendezvousStatus, MeetingStatus } from '@prisma/client';

@Processor(USERS_QUEUE)
@Injectable()
export class UsersProcessor extends WorkerHost {
  private readonly logger = new Logger(UsersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case USERS_JOB_TYPES.UPDATE_ONLINE_STATUS:
        return this.handleUpdateOnlineStatus(job.data);
      case USERS_JOB_TYPES.SYNC_CONSULTANT_STATS:
        return this.handleSyncConsultantStats(job.data);
      case USERS_JOB_TYPES.CLEANUP_CACHE:
        return this.handleCleanupCache();
      default:
        this.logger.warn(`Job non reconnu: ${job.name}`);
        return null;
    }
  }

  private async handleUpdateOnlineStatus(data: {
    userId: string;
    isOnline: boolean;
    socketCount?: number;
  }): Promise<void> {
    const updateData: { isOnline: boolean; lastSeen?: Date } = {
      isOnline: data.isOnline,
    };

    if (!data.isOnline) {
      updateData.lastSeen = new Date();
    }

    await this.prisma.user.update({
      where: { id: data.userId },
      data: updateData,
    });

    const countInfo =
      data.socketCount !== undefined ? ` (${data.socketCount} socket(s))` : '';
    this.logger.debug(
      `Statut en ligne mis à jour pour ${data.userId}: ${data.isOnline}${countInfo}`,
    );
  }

  private async handleSyncConsultantStats(data: {
    consultantId: string;
  }): Promise<void> {
    const [rendezVousCount, meetingCount, reviews] = await Promise.all([
      this.prisma.rendezVous.count({
        where: {
          consultantId: data.consultantId,
          status: {
            in: [RendezvousStatus.CONFIRMED, RendezvousStatus.COMPLETED],
          },
        },
      }),
      this.prisma.followUpMeeting.count({
        where: {
          consultantId: data.consultantId,
          status: { in: [MeetingStatus.CONFIRMED, MeetingStatus.COMPLETED] },
        },
      }),
      this.prisma.consultantReview.findMany({
        where: { consultantId: data.consultantId },
        select: { rating: true },
      }),
    ]);

    const totalAppointments = rendezVousCount + meetingCount;
    const reviewsCount = reviews.length;
    const rating =
      reviewsCount > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount) * 10,
          ) / 10
        : 0;

    const stats = {
      totalAppointments,
      rating,
      reviewsCount,
      rendezVousCount,
      meetingCount,
      computedAt: new Date().toISOString(),
    };

    await this.redisService
      .getClient()
      .set(
        USER_CACHE_KEYS.CONSULTANT_STATS(data.consultantId),
        JSON.stringify(stats),
        'EX',
        600,
      );

    this.logger.debug(
      `Statistiques consultant synchronisées pour ${data.consultantId}`,
    );
  }

  private async handleCleanupCache(): Promise<void> {
    const client = this.redisService.getClient();
    const keys = await client.keys('user:*');
    if (keys.length > 0) {
      await client.del(...keys);
      this.logger.debug(`${keys.length} clés de cache supprimées`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.name} terminé (${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.name} échoué: ${error.message}`);
  }
}
