import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenRepository } from '@/tokens/repositories/refresh-token.repository';
import { RevokedTokenRepository } from '@/tokens/repositories/revoked-token.repository';
import { ResetTokenRepository } from '@/tokens/repositories/reset-token.repository';
import { AUTH_CONSTANTS } from '@/config/auth.constants';

@Injectable()
export class TokenCleanupProcessor {
  private readonly logger = new Logger(TokenCleanupProcessor.name);

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly resetTokenRepository: ResetTokenRepository,
  ) {}

  // Désactive les refresh tokens expirés — toutes les heures.
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRefreshTokens(): Promise<void> {
    const count = await this.refreshTokenRepository.cleanupExpiredTokens();
    if (count > 0) {
      this.logger.log(`${count} refresh tokens expirés désactivés`);
    }
  }

  // Désactive les sessions inactives (remember-me exclu) et celles ayant
  // dépassé la durée maximale de session — toutes les 6 heures.
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupInactiveSessions(): Promise<void> {
    const limit = new Date(
      Date.now() - AUTH_CONSTANTS.INACTIVITY_LIMIT_DAYS * 24 * 60 * 60 * 1000,
    );
    const count =
      await this.refreshTokenRepository.cleanupInactiveSessions(limit);
    if (count > 0) {
      this.logger.log(`${count} sessions inactives nettoyées`);
    }
  }

  // Purge définitive des refresh tokens désactivés depuis plus de 30 jours —
  // une fois par jour à 3h du matin.
  @Cron('0 3 * * *')
  async hardDeleteOldRefreshTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count =
      await this.refreshTokenRepository.hardDeleteDeactivatedTokens(cutoff);
    if (count > 0) {
      this.logger.log(
        `${count} refresh tokens désactivés purgés définitivement`,
      );
    }
  }

  // Purge des revoked tokens de plus de 30 jours — une fois par jour à 3h15.
  @Cron('15 3 * * *')
  async cleanupRevokedTokens(): Promise<void> {
    const count = await this.revokedTokenRepository.cleanupExpired(30);
    if (count > 0) {
      this.logger.log(`${count} revoked tokens purgés`);
    }
  }

  // Purge des reset tokens expirés ou utilisés — une fois par jour à 3h30.
  @Cron('30 3 * * *')
  async cleanupResetTokens(): Promise<void> {
    const count = await this.resetTokenRepository.cleanupExpired();
    if (count > 0) {
      this.logger.log(`${count} reset tokens purgés`);
    }
  }
}
