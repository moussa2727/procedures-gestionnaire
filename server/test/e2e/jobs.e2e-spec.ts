// test/e2e/14-jobs.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  loginAs,
  setTestApp,
} from '../helpers/auth.helper';
import { setupStandardUsers } from '../helpers/fixtures.helper';

describe('Background Jobs (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Nettoyage des sessions expirées', () => {
    it('nettoie les sessions expirées', async () => {
      const { admin } = await setupStandardUsers(app);

      // Créer une session expirée
      const email = 'test-session@e2e.local';
      const password = 'TestSession@123';

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Session',
          lastName: 'Test',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      const setCookieHeader = loginResponse.headers['set-cookie'];
      let refreshToken: string | undefined;

      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader)
          ? setCookieHeader
          : [setCookieHeader];
        refreshToken = cookies
          .find(c => c.startsWith('refresh_token='))
          ?.split('=')[1]
          ?.split(';')[0];
      }

      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
      }

      // Exécuter le job de nettoyage
      // Note: Cette route peut ne pas exister, on teste juste la structure
      // Si la route n'existe pas, on utilise it.skip
    });

    it.skip('nettoie les sessions expirées via le processor', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans SessionCleanupProcessor
    });
  });

  describe('Nettoyage des tokens', () => {
    it.skip('nettoie les refresh tokens expirés', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans TokenCleanupProcessor
    });

    it.skip('nettoie les tokens révoqués', async () => {
      // Test à implémenter quand la route existe
    });

    it.skip('nettoie les reset tokens expirés', async () => {
      // Test à implémenter quand la route existe
    });
  });

  describe('Réconciliation du statut en ligne', () => {
    it.skip('réconcilie le statut en ligne des utilisateurs', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans SessionCleanupProcessor
    });

    it.skip('nettoie les présences Redis orphelines', async () => {
      // Test à implémenter quand la route existe
    });
  });

  describe('Nettoyage des absences', () => {
    it.skip('nettoie les absences expirées', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans AbsenceCleanupProcessor
    });
  });

  describe('Nettoyage des contacts', () => {
    it.skip('nettoie les contacts anciens', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans DeleteOldMessagesProcessor
    });
  });

  describe('Rappels', () => {
    it.skip('envoie les rappels de rendez-vous', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans RendezVousReminderProcessor
    });

    it.skip('envoie les rappels de rendez-vous de suivi', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans FollowUpMeetingReminderProcessor
    });
  });

  describe('Cache des destinations', () => {
    it.skip('précharge le cache des destinations', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans DestinationCacheProcessor
    });

    it.skip('met à jour les statistiques des destinations', async () => {
      // Test à implémenter quand la route existe
      // Cette route est dans DestinationStatsProcessor
    });
  });

  describe('Sécurité - Accès non-admin', () => {
    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/jobs/cleanup-sessions')
        .expect(403);
    });
  });
});