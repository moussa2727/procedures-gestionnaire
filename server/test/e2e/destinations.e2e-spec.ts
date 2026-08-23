// test/e2e/destinations.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createDestinationWithConsultant,
  createTestImageBuffer,
  setupStandardUsers,
} from '../helpers/fixtures.helper';

describe('DestinationsController (e2e)', () => {
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

  describe('Routes publiques', () => {
    it('GET /api/v1/destinations/all — liste publique', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      await createDestinationWithConsultant(app, admin.agent, consultantId);

      await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /api/v1/destinations/search — recherche par pays', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { country } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Canada',
      );

      await request(app.getHttpServer())
        .get('/api/v1/destinations/search')
        .query({ q: country.slice(0, 6) })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/destinations/:id — détail public', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(destinationId);
        });
    });
  });

  describe('Routes admin', () => {
    it('POST /api/v1/admin/destinations — crée une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Allemagne-${Date.now()}`)
        .field('description', 'Destination test e2e Allemagne')
        .field('consultantIds[]', consultantId)
        .attach('image', createTestImageBuffer(), {
          filename: 'dest.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.country).toBeDefined();
    });

    it('POST /api/v1/admin/destinations — rejette sans image', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `SansImage-${Date.now()}`)
        .field('description', 'Sans image')
        .field('consultantIds[]', consultantId)
        .expect(400);
    });

    it('GET /api/v1/admin/destinations/:id — détail admin', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);
    });

    it('DELETE /api/v1/admin/destinations/:id — soft delete', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);
    });

    it('POST /api/v1/admin/destinations/:id/restore — restaure', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/destinations/${destinationId}/restore`)
        .expect(200);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/destinations')
        .field('country', 'Interdit')
        .field('description', 'Test')
        .expect(403);
    });
  });
});