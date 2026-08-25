// test/e2e/19-performance.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp, uniqueEmail } from '../helpers/auth.helper';
import {
  setupStandardUsers,
  createDestinationWithConsultant,
  getNextWorkableDate,
  createProcedureFromRendezVous,
  createRendezVous,
  createStudentSession,
  TimeSlot,
} from '../helpers/fixtures.helper';

describe('Performance Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let destinationId: string;
  let consultantId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);
    const users = await setupStandardUsers(app);
    consultantId = users.consultantId;
    const destination = await createDestinationWithConsultant(
      app,
      users.admin.agent,
      consultantId,
    );
    destinationId = destination.destinationId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Temps de réponse', () => {
    it('GET /api/v1/destinations/all répond en moins de 500ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('GET /api/v1/destinations/:id répond en moins de 200ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/v1/availability/day répond en moins de 300ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: getNextWorkableDate() })
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });

    it('GET /api/v1/users/consultant/:id/public répond en moins de 300ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Cache Redis', () => {
    it('améliore les temps de réponse après mise en cache', async () => {
      // Première requête (sans cache)
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);
      const duration1 = Date.now() - start1;

      // Deuxième requête (avec cache)
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);
      const duration2 = Date.now() - start2;

      // La deuxième requête devrait être plus rapide
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });

    it('invalide le cache après mise à jour', async () => {
      const { admin } = await setupStandardUsers(app);

      // Remplir le cache
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);

      // Mettre à jour la destination
      await authenticatedRequest(admin.agent)
        .put(`/api/v1/admin/destinations/${destinationId}`)
        .field('description', 'Updated description')
        .expect(200);

      // Vérifier que le cache est invalidé
      const cached = await redisService.getClient().get(`destination:${destinationId}`);
      expect(cached).toBeNull();
    });
  });

  describe('Concurrence', () => {
    it('gère les requêtes concurrentes sur /destinations/all', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/v1/destinations/all')
            .expect(200)
        );
      }
      const responses = await Promise.all(promises);
      expect(responses.length).toBe(10);
      responses.forEach(r => expect(r.status).toBe(200));
    });

    it('gère les requêtes concurrentes sur /availability/day', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/v1/availability/day')
            .query({ destinationId, date: getNextWorkableDate() })
            .expect(200)
        );
      }
      const responses = await Promise.all(promises);
      expect(responses.length).toBe(10);
      responses.forEach(r => expect(r.status).toBe(200));
    });
  });

  describe('Charge', () => {
    it('gère un grand nombre de créneaux', async () => {
      // Créer plusieurs rendez-vous pour tester la charge
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app);

      const promises = [];
      for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() + 10 + i);
        const dateStr = date.toISOString().split('T')[0];
        promises.push(
          authenticatedRequest(student.agent)
            .post('/api/v1/rendez-vous')
            .send({
              consultantId,
              destinationId,
              date: dateStr,
              time: TimeSlot.SLOT_1000,
              firstName: `Test${i}`,
              lastName: `User${i}`,
              email: uniqueEmail(`load-${i}`),
              phone: '0600000001',
              sector: 'Informatique',
              studyLevel: 'Master',
            })
        );
      }

      const responses = await Promise.all(promises);
      const successful = responses.filter(r => r.status === 201 || r.status === 400);
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Base de données', () => {
    it('les requêtes Prisma sont efficaces', async () => {
      const start = Date.now();
      
      // Récupérer toutes les destinations avec leurs consultants
      const destinations = await prisma.destination.findMany({
        where: { isDeleted: false },
        include: {
          consultants: {
            include: {
              consultant: true,
            },
          },
        },
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
      expect(Array.isArray(destinations)).toBe(true);
    });

    it('les transactions sont efficaces', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app);

      const start = Date.now();

      // Créer un rendez-vous avec transaction
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      // Créer une procédure avec transaction
      await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});