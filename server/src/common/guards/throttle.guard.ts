// src/common/guards/throttle.guard.ts

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@/redis/redis.service';
import type { Request } from 'express';
import { CurrentUser } from '../interfaces/current-user.interface';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number;
}

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly logger = new Logger(ThrottleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const throttleOptions = this.reflector.get<ThrottleOptions>(
      THROTTLE_KEY,
      context.getHandler(),
    );

    // Aucun throttle configuré sur cette route
    if (!throttleOptions) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUser }>();

    const user = request.user;

    const ip =
      request.ip ||
      request.socket?.remoteAddress ||
      request.connection?.remoteAddress ||
      'anonymous';

    const endpoint = request.route?.path || request.url;

    // Utilisateur authentifié : user.id
    // Sinon : adresse IP
    const identifier = user?.id || ip;

    const key = `throttle:${endpoint}:${identifier}`;

    const client = this.redisService.getClient();

    try {
      const current = await client.get(key);

      // Première requête
      if (!current) {
        await client.set(key, '1', 'EX', throttleOptions.ttl);

        return true;
      }

      const count = Number.parseInt(current, 10);

      // Sécurité supplémentaire si Redis contient une valeur invalide
      if (Number.isNaN(count)) {
        await client.set(key, '1', 'EX', throttleOptions.ttl);

        return true;
      }

      // Limite atteinte
      if (count >= throttleOptions.limit) {
        const ttl = await client.ttl(key);

        const timeLeft = ttl > 0 ? ttl : throttleOptions.ttl;

        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${endpoint}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Trop de requêtes. Veuillez réessayer dans ${timeLeft} secondes.`,
            error: 'Too Many Requests',
            retryAfter: timeLeft,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Incrémentation du compteur
      await client.incr(key);

      return true;
    } catch (error) {
      // On laisse passer notre erreur 429
      if (error instanceof HttpException) {
        throw error;
      }

      // Une panne Redis ne doit pas bloquer l'application
      this.logger.error(
        `Throttle error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return true;
    }
  }
}
