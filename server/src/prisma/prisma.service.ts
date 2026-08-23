// prisma/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    // Créer un pool de connexions PostgreSQL avec paramètres optimisés
    const pool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxUses: 7500,
    });

    // Créer l'adaptateur
    const adapter = new PrismaPg(pool);

    // Passer l'adaptateur à PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connexion Prisma établie');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Connexion Prisma fermée');
  }
}
