// src/seed/seed.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminAccount();
  }

  /**
   * Masque un email pour les logs (ex: test@example.com → t***@e***.com)
   */
  private maskEmail(email: string): string {
    if (!email) return '***';
    const [localPart, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal =
      localPart.length > 2 ? localPart.substring(0, 2) + '***' : '***';
    const [domainName, tld] = domain.split('.');
    const maskedDomain =
      domainName.length > 2 ? domainName.substring(0, 2) + '***' : '***';
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  /**
   * Masque un mot de passe pour les logs
   */
  private maskPassword(password: string): string {
    if (!password) return '***';
    if (password.length <= 4) return '****';
    return (
      password.substring(0, 2) + '***' + password.substring(password.length - 1)
    );
  }

  /**
   * Verifie et cree le compte admin si inexistant
   *
   * Invariant README :
   * - "Un seul compte ADMIN existe dans tout le systeme."
   * - "L'adresse email de l'administrateur est obligatoirement egale a ADMIN_EMAIL."
   */
  private async ensureAdminAccount(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail) {
      this.logger.warn(
        "ADMIN_EMAIL non defini dans les variables d'environnement. " +
          'Le compte administrateur ne sera pas cree automatiquement.',
      );
      return;
    }

    if (!adminPassword) {
      this.logger.error(
        "ADMIN_PASSWORD non defini dans les variables d'environnement. " +
          'Le compte administrateur ne peut pas etre cree.',
      );
      return;
    }

    // Verifier si un admin existe deja
    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN, isDeleted: false },
    });

    if (existingAdmin) {
      // Verifier que l'email correspond a ADMIN_EMAIL
      if (existingAdmin.email !== adminEmail) {
        this.logger.error(
          `Un administrateur existe deja avec un email different de ADMIN_EMAIL.\n` +
            `Admin existant: ${this.maskEmail(existingAdmin.email)}\n` +
            `ADMIN_EMAIL configure: ${this.maskEmail(adminEmail)}\n` +
            `Veuillez corriger la configuration ou supprimer l'admin existant.`,
        );
      } else {
        this.logger.log(
          `Compte administrateur deja existant: ${this.maskEmail(adminEmail)}`,
        );
      }
      return;
    }

    // Creer le compte admin
    try {
      const hashedPassword = await argon2.hash(adminPassword);

      await this.prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'Systeme',
          role: UserRole.ADMIN,
          isActive: true,
          photo: '',
          photoPublicId: '',
        },
      });

      this.logger.log(
        `Compte administrateur cree avec succes: ${this.maskEmail(adminEmail)}`,
      );
      this.logger.warn(
        `Mot de passe admin: ${this.maskPassword(adminPassword)} (a changer immediatement)`,
      );
    } catch (error) {
      this.logger.error(
        `Echec de creation du compte administrateur: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Verifie et met a jour le mot de passe admin si necessaire
   * Utilise uniquement si l'admin existe mais que le mot de passe doit etre force
   */
  async forceAdminPasswordReset(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn('ADMIN_EMAIL ou ADMIN_PASSWORD non defini');
      return;
    }

    const admin = await this.prisma.user.findFirst({
      where: { email: adminEmail, role: UserRole.ADMIN, isDeleted: false },
    });

    if (!admin) {
      this.logger.warn(
        `Aucun administrateur trouve avec l'email: ${this.maskEmail(adminEmail)}`,
      );
      return;
    }

    const hashedPassword = await argon2.hash(adminPassword);

    await this.prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    this.logger.log(
      `Mot de passe administrateur reinitialise avec succes: ${this.maskEmail(adminEmail)}`,
    );
  }
}
