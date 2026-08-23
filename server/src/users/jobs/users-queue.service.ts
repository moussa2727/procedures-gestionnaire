// users/jobs/users-queue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { USERS_QUEUE, USERS_JOB_TYPES } from './users-job.constants';

export interface UpdateOnlineStatusData {
  userId: string;
  isOnline: boolean;
  socketCount?: number;
}

export interface SyncConsultantStatsData {
  consultantId: string;
}

@Injectable()
export class UsersQueueService {
  private readonly logger = new Logger(UsersQueueService.name);

  constructor(@InjectQueue(USERS_QUEUE) private readonly usersQueue: Queue) {}

  async updateOnlineStatus(data: UpdateOnlineStatusData): Promise<void> {
    await this.usersQueue.add(USERS_JOB_TYPES.UPDATE_ONLINE_STATUS, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    const status = data.isOnline ? 'en ligne' : 'hors ligne';
    const countInfo =
      data.socketCount !== undefined ? ` (${data.socketCount} socket(s))` : '';
    this.logger.debug(
      `Statut ${status} mis en file pour ${data.userId}${countInfo}`,
    );
  }

  async syncConsultantStats(data: SyncConsultantStatsData): Promise<void> {
    await this.usersQueue.add(USERS_JOB_TYPES.SYNC_CONSULTANT_STATS, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.debug(
      `Synchronisation des statistiques consultant en file pour ${data.consultantId}`,
    );
  }

  async cleanupCache(): Promise<void> {
    await this.usersQueue.add(
      USERS_JOB_TYPES.CLEANUP_CACHE,
      {},
      {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
        delay: 60000,
      },
    );
    this.logger.debug('Nettoyage du cache en file');
  }
}
