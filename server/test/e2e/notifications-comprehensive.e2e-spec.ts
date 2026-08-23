// test/e2e/notifications-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp, uniqueEmail } from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
} from '../helpers/fixtures.helper';

describe('NotificationsController (e2e) — complémentaire', () => {
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

  // Crée un message de contact public → notifie tous les admins (CONTACT_NEW)
  async function createContactMessage(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/contacts')
      .send({
        name: 'Notification Test',
        email: uniqueEmail('notif'),
        message:
          'Ceci est un message de test pour generer une notification admin.',
      })
      .expect(201);
  }

  describe('GET /notifications — pagination', () => {
    it('respecte les paramètres page et limit', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();
      await createContactMessage();
      await createContactMessage();

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.totalPages).toBe(2);
    });

    it('pagine sur la seconde page', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();
      await createContactMessage();
      await createContactMessage();

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(3);
    });
  });

  describe('Compteur de non-lues', () => {
    it('GET /unread-count — précis après création de contacts', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();
      await createContactMessage();

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications/unread-count')
        .expect(200);

      expect(response.body.count).toBe(2);
    });

    it('le compteur évolue après marquage comme lu', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();
      await createContactMessage();

      const list = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const unreadCountBefore = (
        await authenticatedRequest(admin.agent)
          .get('/api/v1/notifications/unread-count')
          .expect(200)
      ).body.count;
      expect(unreadCountBefore).toBe(2);

      const notificationId = list.body.items[0].id;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isRead).toBe(true);
        });

      const countAfter = (
        await authenticatedRequest(admin.agent)
          .get('/api/v1/notifications/unread-count')
          .expect(200)
      ).body.count;
      expect(countAfter).toBe(1);
    });
  });

  describe('Marquage comme lu', () => {
    it('PATCH /notifications/:id/read — marque une notification individuelle', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();

      const list = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const notificationId = list.body.items[0].id;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(notificationId);
          expect(res.body.isRead).toBe(true);
          expect(res.body.readAt).toBeTruthy();
        });
    });

    it('PATCH /notifications/read-all — marque toutes les notifications comme lues', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();
      await createContactMessage();
      await createContactMessage();

      const response = await authenticatedRequest(admin.agent)
        .patch('/api/v1/notifications/read-all')
        .expect(200);

      expect(response.body.updatedCount).toBe(3);

      const count = (
        await authenticatedRequest(admin.agent)
          .get('/api/v1/notifications/unread-count')
          .expect(200)
      ).body.count;
      expect(count).toBe(0);
    });
  });

  describe('Liste par rôle', () => {
    it('admin peut lister ses notifications', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContactMessage();

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0].type).toBe('CONTACT_NEW');
    });

    it('consultant peut lister ses notifications', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      const { consultant } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('étudiant peut lister ses notifications', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('Liste vide et types', () => {
    it('retourne un tableau vide quand aucune notification', async () => {
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);

      const count = (
        await authenticatedRequest(student.agent)
          .get('/api/v1/notifications/unread-count')
          .expect(200)
      ).body.count;
      expect(count).toBe(0);
    });

    it('les types de notification sont corrects selon l\'événement', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      const consult = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consult.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const types = response.body.items.map((n: any) => n.type);
      expect(types).toContain('RENDEZVOUS_CREATED');
    });

    it('non authentifié ne peut pas lister les notifications', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });
});
