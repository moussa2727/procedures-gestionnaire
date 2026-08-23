// auth/auth.service.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import {
  AuditAction,
  AuthProvider,
  RevocationReason,
  User,
  UserRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RefreshTokenRepository } from '@/tokens/repositories/refresh-token.repository';
import { RevokedTokenRepository } from '@/tokens/repositories/revoked-token.repository';
import { ResetTokenRepository } from '@/tokens/repositories/reset-token.repository';
import { SessionService } from './session.service';
import { EmailQueueService } from '@/email/jobs/email-queue.service';
import { RedisService } from '@/redis/redis.service';
import { AUTH_CONSTANTS } from '@/config/auth.constants';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { RegisterDto } from './dto/register.dto';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { UsersGateway } from '@/users/users.gateway';

export interface DeviceContext {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly resetTokenRepository: ResetTokenRepository,
    private readonly sessionService: SessionService,
    private readonly emailQueueService: EmailQueueService,
    private readonly redisService: RedisService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly usersGateway: UsersGateway,
  ) {}

  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.isDeleted || !user.password) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Compte temporairement verrouille suite a plusieurs tentatives echouees',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Compte desactive');
    }

    const isValid = await argon2.verify(user.password, password);

    if (!isValid) {
      await this.registerFailedAttempt(user);
      return null;
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return user;
  }

  private async registerFailedAttempt(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION_MS)
          : undefined,
      },
    });

    if (shouldLock) {
      await this.writeAudit(user.id, AuditAction.LOGIN, 'User', user.id, {
        reason: 'account_locked',
      });

      try {
        const lockDurationMinutes =
          AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION_MS / 60000;
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const supportEmail =
          this.configService.get<string>('EMAIL_FROM') || 'support@example.com';

        await this.emailQueueService.send({
          to: user.email,
          subject: 'Compte verrouille - Trop de tentatives de connexion',
          template: 'users/account-locked',
          context: {
            firstName: user.firstName,
            lastName: user.lastName,
            attempts: attempts,
            lockDurationMinutes: lockDurationMinutes,
            unlockTime: new Date(
              Date.now() + AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION_MS,
            ).toLocaleString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            supportEmail: supportEmail,
            frontendUrl: frontendUrl || 'https://example.com',
            year: new Date().getFullYear(),
          },
        });
        this.logger.warn(
          `Compte verrouille pour ${this.maskId(user.id)} (${this.maskEmail(user.email)}) - ${attempts} tentatives echouees`,
        );
      } catch (error) {
        this.logger.error(
          `Erreur lors de l'envoi de l'email de verrouillage pour ${this.maskEmail(user.email)}: ${(error as Error).message}`,
        );
      }
    }
  }

  async register(dto: RegisterDto, context: DeviceContext): Promise<User> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

    if (adminEmail && dto.email === adminEmail) {
      throw new ForbiddenException(
        'Cette adresse email est reservee au compte administrateur du systeme',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un compte existe deja avec cet email');
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
          role: UserRole.ETUDIANT,
          isActive: true,
          photo: '',
          photoPublicId: '',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: AuditAction.CREATE,
          entity: 'User',
          entityId: newUser.id,
          success: true,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            email: newUser.email,
            role: newUser.role,
            source: 'self_register',
          },
        },
      });

      return newUser;
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    await this.emailQueueService.send({
      to: user.email,
      subject: 'Bienvenue',
      template: 'users/welcome',
      context: {
        firstName: user.firstName,
        lastName: user.lastName,
        frontendUrl: frontendUrl || 'https://example.com',
      },
    });

    return user;
  }

  async login(
    user: User,
    context: DeviceContext,
    rememberMe: boolean,
  ): Promise<AuthTokens> {
    const tokens = await this.issueTokens(
      user,
      context,
      rememberMe,
      AuthProvider.LOCAL,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
        lastLoginIp: context.ipAddress,
      },
    });

    this.usersGateway.notifyUserStatus(user.id, true);

    await this.writeLoginHistory(user.id, AuthProvider.LOCAL, context, true);
    await this.writeAudit(user.id, AuditAction.LOGIN, 'User', user.id, {
      provider: 'LOCAL',
    });

    return tokens;
  }

  async loginWithGoogle(
    profile: {
      providerId: string;
      email: string;
      firstName: string;
      lastName: string;
    },
    context: DeviceContext,
  ): Promise<AuthTokens> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

    if (adminEmail && profile.email === adminEmail) {
      throw new ForbiddenException(
        'Cette adresse email est reservee au compte administrateur du systeme',
      );
    }

    const authProvider = await this.prisma.userAuthProvider.findUnique({
      where: {
        provider_providerId: {
          provider: AuthProvider.GOOGLE,
          providerId: profile.providerId,
        },
      },
      include: { user: true },
    });

    let user: User;
    let isNewUser = false;

    if (authProvider) {
      user = authProvider.user;

      if (!user.isActive || user.isDeleted) {
        throw new ForbiddenException('Compte desactive');
      }
    } else {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        if (!existingUser.isActive || existingUser.isDeleted) {
          throw new ForbiddenException('Compte desactive');
        }

        await this.prisma.userAuthProvider.create({
          data: {
            userId: existingUser.id,
            provider: AuthProvider.GOOGLE,
            providerId: profile.providerId,
          },
        });
        user = existingUser;
      } else {
        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              role: UserRole.ETUDIANT,
              photo: '',
              photoPublicId: '',
              authProviders: {
                create: {
                  provider: AuthProvider.GOOGLE,
                  providerId: profile.providerId,
                },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              userId: newUser.id,
              action: AuditAction.CREATE,
              entity: 'User',
              entityId: newUser.id,
              success: true,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              metadata: {
                email: newUser.email,
                role: newUser.role,
                provider: 'GOOGLE',
              },
            },
          });

          return newUser;
        });
        isNewUser = true;
      }
    }

    const tokens = await this.issueTokens(
      user,
      context,
      false,
      AuthProvider.GOOGLE,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
        lastLoginIp: context.ipAddress,
      },
    });

    this.usersGateway.notifyUserStatus(user.id, true);

    await this.writeLoginHistory(user.id, AuthProvider.GOOGLE, context, true);
    await this.writeAudit(user.id, AuditAction.LOGIN, 'User', user.id, {
      provider: 'GOOGLE',
    });

    if (isNewUser) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      await this.emailQueueService.send({
        to: user.email,
        subject: 'Bienvenue sur notre plateforme',
        template: 'users/welcome',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: 'Etudiant',
          createdAt: user.createdAt.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          loginUrl: `${frontendUrl || 'https://example.com'}/login`,
          frontendUrl: frontendUrl || 'https://example.com',
          year: new Date().getFullYear(),
        },
      });
    }

    return tokens;
  }

  async disconnectGoogle(userId: string): Promise<void> {
    const provider = await this.prisma.userAuthProvider.findFirst({
      where: {
        userId,
        provider: AuthProvider.GOOGLE,
      },
    });

    if (!provider) {
      throw new BadRequestException('Aucun compte Google lie');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      throw new BadRequestException(
        "Impossible de dissocier le compte Google : vous n'avez pas de mot de passe",
      );
    }

    await this.prisma.userAuthProvider.delete({
      where: { id: provider.id },
    });

    await this.writeAudit(userId, AuditAction.UPDATE, 'User', userId, {
      action: 'google_disconnect',
    });
  }

  private async issueTokens(
    user: User,
    context: DeviceContext,
    rememberMe: boolean,
    provider: AuthProvider,
  ): Promise<AuthTokens> {
    const sessionExpirationMs = rememberMe
      ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRATION_SEC * 1000
      : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION_SEC * 1000;

    const refreshTokenExpiresAt = new Date(Date.now() + sessionExpirationMs);
    const accessTokenExpiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRATION_SEC * 1000,
    );

    // Utilisation de randomUUID() au lieu de uuidv4()
    const sessionToken = randomUUID();
    const session = await this.sessionService.create(
      {
        userId: user.id,
        deviceInfo: context.deviceInfo,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      sessionToken,
      refreshTokenExpiresAt,
    );

    // Utilisation de randomUUID() au lieu de uuidv4()
    const refreshTokenValue = randomUUID();
    const refreshTokenRecord = await this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiresAt,
      isRememberMe: rememberMe,
    });

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRATION_SEC,
    });

    const refreshPayload = {
      sub: user.id,
      sessionId: session.id,
      refreshTokenId: refreshTokenRecord.id,
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: rememberMe
        ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRATION_SEC
        : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION_SEC,
    });

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { sessionId: session.id },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async refresh(
    userId: string,
    sessionId: string,
    refreshTokenId: string,
    context: DeviceContext,
  ): Promise<AuthTokens> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: refreshTokenId },
    });

    if (!tokenRecord || tokenRecord.userId !== userId) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (!tokenRecord.isActive) {
      this.logger.warn(
        `Reutilisation de refresh token detectee pour user ${this.maskId(userId)}`,
      );
      await this.refreshTokenRepository.deactivateAllForUser(userId);
      await this.sessionService.deactivateAllForUser(
        userId,
        RevocationReason.TOKEN_REUSE_DETECTED,
      );
      await this.writeAudit(userId, AuditAction.LOGOUT, 'Session', sessionId, {
        reason: 'token_reuse_detected',
      });

      const compromisedUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (compromisedUser) {
        this.emailQueueService
          .send({
            to: compromisedUser.email,
            subject: 'Alerte de securite sur votre compte',
            template: 'system/security-alert',
            context: {
              firstName: compromisedUser.firstName,
              detectedAt: new Date().toLocaleString('fr-FR'),
              ipAddress: context.ipAddress,
            },
          })
          .catch((error) =>
            this.logger.error(
              `Echec mise en queue alerte securite: ${(error as Error).message}`,
            ),
          );
      }

      throw new UnauthorizedException(
        'Anomalie de securite detectee, veuillez vous reconnecter',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedException('Compte invalide');
    }

    const accessTokenExpiresAt = new Date(
      Date.now() + AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRATION_SEC * 1000,
    );

    // Utilisation de randomUUID() au lieu de uuidv4()
    const newRefreshTokenValue = randomUUID();
    const rotated = await this.refreshTokenRepository.rotateToken(
      tokenRecord.id,
      newRefreshTokenValue,
      tokenRecord.expiresAt,
    );

    await this.prisma.refreshToken.update({
      where: { id: rotated.id },
      data: { sessionId },
    });

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRATION_SEC,
    });

    const refreshPayload = {
      sub: user.id,
      sessionId,
      refreshTokenId: rotated.id,
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: rotated.rememberMe
        ? AUTH_CONSTANTS.REMEMBER_ME_EXPIRATION_SEC
        : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRATION_SEC,
    });

    await this.refreshTokenRepository.updateLastActivity(rotated.id);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt: rotated.expiresAt,
    };
  }

  async logout(
    userId: string,
    sessionId: string,
    accessToken: string,
  ): Promise<void> {
    await this.sessionService.deactivate(
      sessionId,
      RevocationReason.MANUAL_LOGOUT,
    );

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (session) {
      const refreshTokens = await this.prisma.refreshToken.findMany({
        where: { sessionId, isActive: true },
      });
      for (const token of refreshTokens) {
        await this.refreshTokenRepository.deactivate(token.id);
      }
    }

    if (accessToken) {
      const remainingTtl = this.getTokenRemainingTtlSeconds(accessToken);
      if (remainingTtl > 0) {
        await this.redisService
          .getClient()
          .set(`blacklist:access:${accessToken}`, '1', 'EX', remainingTtl);
      }

      await this.revokedTokenRepository.revoke({
        token: accessToken,
        userId,
        reason: 'MANUAL_LOGOUT',
      });
    }

    const activeSessions = await this.sessionService.findActiveByUserId(userId);
    if (activeSessions.length === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });
      this.usersGateway.notifyUserStatus(userId, false);
    }

    await this.writeAudit(userId, AuditAction.LOGOUT, 'Session', sessionId, {});
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await this.refreshTokenRepository.deactivateAllForUser(userId);
    await this.sessionService.deactivateAllForUser(
      userId,
      RevocationReason.MANUAL_REVOKE,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    this.usersGateway.notifyUserStatus(userId, false);

    this.notificationsGateway.emitToUser(userId, 'session:revoked', {
      reason: 'all_sessions',
      timestamp: new Date().toISOString(),
    });

    await this.writeAudit(userId, AuditAction.LOGOUT, 'User', userId, {
      reason: 'all_sessions',
    });

    this.logger.log(
      `Toutes les sessions revoquees pour l'utilisateur ${this.maskId(userId)}`,
    );
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.isDeleted || !user.isActive) {
      return;
    }

    const resetToken = await this.resetTokenRepository.create({
      userId: user.id,
      expiresIn: AUTH_CONSTANTS.RESET_TOKEN_EXPIRATION_MS,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl || 'https://example.com'}/reset-password?token=${resetToken.token}`;

    await this.emailQueueService.send({
      to: user.email,
      subject: 'Reinitialisation de votre mot de passe',
      template: 'users/reset-password',
      context: { firstName: user.firstName, resetUrl },
    });

    await this.writeAudit(
      user.id,
      AuditAction.UPDATE,
      'ResetToken',
      resetToken.id,
      {
        action: 'requested',
      },
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.resetTokenRepository.findValidToken(token);

    if (!resetToken) {
      throw new BadRequestException(
        'Lien de reinitialisation invalide ou expire',
      );
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.resetTokenRepository.markAsUsed(resetToken.id);
    await this.refreshTokenRepository.deactivateAllForUser(resetToken.userId);
    await this.sessionService.deactivateAllForUser(
      resetToken.userId,
      RevocationReason.PASSWORD_CHANGED,
    );

    await this.writeAudit(
      resetToken.userId,
      AuditAction.UPDATE,
      'User',
      resetToken.userId,
      {
        action: 'password_reset',
      },
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
    accessToken?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.password) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    const isValid = await argon2.verify(user.password, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    const sessions = await this.sessionService.findActiveByUserId(userId);
    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        await this.sessionService.deactivate(
          session.id,
          RevocationReason.PASSWORD_CHANGED,
        );
        const tokens = await this.prisma.refreshToken.findMany({
          where: { sessionId: session.id, isActive: true },
        });
        for (const token of tokens) {
          await this.refreshTokenRepository.deactivate(token.id);
        }
      }
    }

    if (accessToken) {
      const remainingTtl = this.getTokenRemainingTtlSeconds(accessToken);
      if (remainingTtl > 0) {
        await this.redisService
          .getClient()
          .set(`blacklist:access:${accessToken}`, '1', 'EX', remainingTtl);
        this.logger.debug(
          `Token d'acces actuel blackliste pour changement de mot de passe`,
        );
      }
    }

    await this.writeAudit(userId, AuditAction.UPDATE, 'User', userId, {
      action: 'password_changed',
    });
  }

  private async writeLoginHistory(
    userId: string,
    provider: AuthProvider,
    context: DeviceContext,
    success: boolean,
  ): Promise<void> {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        provider,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success,
      },
    });
  }

  private async writeAudit(
    userId: string,
    action: AuditAction,
    entity: string,
    entityId: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        success: true,
        action,
        entity,
        entityId,
        metadata,
      },
    });
  }

  private getTokenRemainingTtlSeconds(token: string): number {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded?.exp) {
        return 0;
      }
      return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
    } catch {
      return 0;
    }
  }

  private maskId(id: string): string {
    if (id.length <= 8) return '***';
    return `${id.substring(0, 3)}...${id.substring(id.length - 3)}`;
  }

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
