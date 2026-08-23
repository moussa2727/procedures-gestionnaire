import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:10000/api/v1/auth/google/callback';

    if (nodeEnv === 'production') {
      if (!clientID || !clientSecret || !callbackURL) {
        throw new Error('Google OAuth configuration manquante en production');
      }
    }

    super({
      clientID: clientID || '',
      clientSecret: clientSecret || '',
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      name?: { givenName?: string; familyName?: string };
    },
    done: VerifyCallback,
  ): void {
    try {
      const email = profile.emails?.[0]?.value;

      if (!email) {
        this.logger.warn('Profil Google sans email');
        done(new Error('Email Google introuvable'), undefined);
        return;
      }

      const googleProfile: GoogleProfile = {
        providerId: profile.id,
        email,
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
      };

      done(null, googleProfile);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la validation Google: ${(error as Error).message}`,
      );
      done(
        error instanceof Error ? error : new Error('Erreur inconnue'),
        undefined,
      );
    }
  }
}
