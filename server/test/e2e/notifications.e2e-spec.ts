// test/e2e/notifications.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  setTestApp,
} from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  setupStandardUsers,
} from '../helpers/fixtures.helper';

describe('NotificationsController (e2e)', () => {
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

  describe('GET /api/v1/notifications — lister mes notifications', () => {
    it('etudiant peut lister ses notifications', async () => {
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('consultant peut lister ses notifications', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('admin peut lister ses notifications', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('non authentifié ne peut pas lister les notifications', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count — nombre de notifications non lues', () => {
    it('etudiant peut obtenir le nombre de notifications non lues', async () => {
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications/unread-count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('PATCH /api/v1/notifications/:id/read — marquer une notification comme lue', () => {
    it('etudiant peut marquer une notification comme lue', async () => {
      const student = await createStudentSession(app);

      const listResponse = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const notifications = listResponse.body;
      if (notifications.length > 0) {
        const notificationId = notifications[0].id;

        const response = await authenticatedRequest(student.agent)
          .patch(`/api/v1/notifications/${notificationId}/read`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.isRead).toBe(true);
      }
    });
  });

  describe('PATCH /api/v1/notifications/read-all — marquer toutes les notifications comme lues', () => {
    it('etudiant peut marquer toutes les notifications comme lues', async () => {
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .patch('/api/v1/notifications/read-all')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });
});