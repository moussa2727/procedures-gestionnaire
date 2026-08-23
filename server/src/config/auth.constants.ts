import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_EXPIRATION_SEC: 900,
  REFRESH_TOKEN_EXPIRATION_SEC: 604800,
  REMEMBER_ME_EXPIRATION_SEC: 2592000,
  SESSION_MAX_DURATION_SEC: 2592000,
  SESSION_MAX_DURATION_MS: 30 * 24 * 60 * 60 * 1000,
  MAX_REFRESH_TOKEN_ROTATION: 10,

  // README, section Sessions : "Tous les utilisateurs sont limités à un
  // maximum de 2 sessions simultanées. Cette contrainte s'applique à
  // ADMIN, CONSULTANT, ETUDIANT. Toute tentative de création d'une
  // troisième session doit être refusée conformément aux règles métier."
  // Valeur fixée à 2 — jamais d'éviction automatique de la session la
  // plus ancienne, la troisième tentative est explicitement rejetée par
  // SessionService.create().
  MAX_ACTIVE_SESSIONS_PER_USER: 2,

  INACTIVITY_LIMIT_DAYS: 30,
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_MS: 15 * 60 * 1000,
  RESET_TOKEN_EXPIRATION_MS: 30 * 60 * 1000,
} as const;

export const REVOCATION_REASONS = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_ROTATED: 'TOKEN_ROTATED',
  MANUAL_LOGOUT: 'MANUAL_LOGOUT',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  ADMIN_REVOKE: 'ADMIN_REVOKE',
  MANUAL_REVOKE: 'MANUAL_REVOKE',
  MAX_SESSIONS_REACHED: 'MAX_SESSIONS_REACHED',
  INACTIVITY: 'INACTIVITY',
  SESSION_MAX_AGE: 'SESSION_MAX_AGE',
} as const;

// Factory injectable pour la configuration des cookies d'authentification
// en environnement cross-site (frontend Vercel, backend Railway).
export interface CookieOptions {
  secure: boolean;
  sameSite: 'none' | 'lax';
  path: string;
  httpOnly: boolean;
  partitioned?: boolean;
}

@Injectable()
export class CookieOptionsFactory {
  private readonly logger = new Logger(CookieOptionsFactory.name);
  private readonly isProd: boolean;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    this.isProd = nodeEnv === 'production';

    if (!this.isProd) {
      this.logger.warn(
        `NODE_ENV="${nodeEnv}" — les cookies utiliseront sameSite='lax' ` +
          `et secure=false. En environnement cross-site, ceci bloque ` +
          `l'authentification sur mobile. Vérifiez NODE_ENV sur Railway.`,
      );
    }
  }

  private base(): Omit<CookieOptions, 'httpOnly'> {
    return {
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
      path: '/',
      ...(this.isProd && { partitioned: true }),
    };
  }

  access(): CookieOptions {
    return { ...this.base(), httpOnly: true };
  }

  refresh(): CookieOptions {
    return { ...this.base(), httpOnly: true };
  }
}
