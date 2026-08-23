import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,

      retryStrategy: (times) => Math.min(times * 200, 2000),

      enableReadyCheck: true,

      lazyConnect: false,

      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      this.logger.log('Connexion Redis établie');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis prêt');
    });

    this.client.on('error', (error) => {
      this.logger.error('Erreur Redis', error);
    });

    this.client.on('close', () => {
      this.logger.warn('Connexion Redis fermée');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Reconnexion Redis...');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }
}
