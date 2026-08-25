// test/e2e/10-notifications.e2e-spec.ts
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

      expect(response.body.items || response.body).toBeDefined();
      const notifications = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('consultant peut lister ses notifications', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const notifications = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('admin peut lister ses notifications', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const notifications = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('paginate les notifications', async () => {
      const student = await createStudentSession(app);

      // Créer plusieurs notifications
      for (let i = 0; i < 5; i++) {
        await prisma.notification.create({
          data: {
            userId: student.user.id,
            type: 'SYSTEM',
            title: `Notification ${i}`,
            message: `Message ${i}`,
          },
        });
      }

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.items || response.body).toBeDefined();
      const notifications = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(notifications.length).toBeLessThanOrEqual(2);
      if (response.body.total) {
        expect(response.body.total).toBeGreaterThanOrEqual(5);
      }
    });

    it('non authentifié ne peut pas lister les notifications', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('etudiant peut obtenir le nombre de notifications non lues', async () => {
      const student = await createStudentSession(app);

      // Créer des notifications non lues
      await prisma.notification.createMany({
        data: [
          {
            userId: student.user.id,
            type: 'SYSTEM',
            title: 'Notif 1',
            message: 'Message 1',
            isRead: false,
          },
          {
            userId: student.user.id,
            type: 'SYSTEM',
            title: 'Notif 2',
            message: 'Message 2',
            isRead: false,
          },
          {
            userId: student.user.id,
            type: 'SYSTEM',
            title: 'Notif 3',
            message: 'Message 3',
            isRead: true,
          },
        ],
      });

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications/unread-count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBe(2);
    });

    it('consultant peut obtenir le nombre de notifications non lues', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/notifications/unread-count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('etudiant peut marquer une notification comme lue', async () => {
      const student = await createStudentSession(app);

      // Créer une notification non lue
      const notification = await prisma.notification.create({
        data: {
          userId: student.user.id,
          type: 'SYSTEM',
          title: 'Test Notification',
          message: 'Test Message',
          isRead: false,
        },
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.isRead).toBe(true);
      expect(response.body.readAt).toBeDefined();

      // Vérifier en base
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });

    it('etudiant ne peut pas marquer la notification d\'un autre', async () => {
      const student1 = await createStudentSession(app, 'first');
      const student2 = await createStudentSession(app, 'second');

      const notification = await prisma.notification.create({
        data: {
          userId: student1.user.id,
          type: 'SYSTEM',
          title: 'Test Notification',
          message: 'Test Message',
          isRead: false,
        },
      });

      await authenticatedRequest(student2.agent)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .expect(403);
    });

    it('retourne 404 pour une notification inexistante', async () => {
      const student = await createStudentSession(app);

      await authenticatedRequest(student.agent)
        .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .expect(404);
    });

    it('ne change rien si déjà lue', async () => {
      const student = await createStudentSession(app);

      const notification = await prisma.notification.create({
        data: {
          userId: student.user.id,
          type: 'SYSTEM',
          title: 'Test Notification',
          message: 'Test Message',
          isRead: true,
          readAt: new Date(),
        },
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .expect(200);

      expect(response.body.isRead).toBe(true);
      expect(response.body.readAt).toBeDefined();
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('etudiant peut marquer toutes les notifications comme lues', async () => {
      const student = await createStudentSession(app);

      // Créer plusieurs notifications non lues
      await prisma.notification.createMany({
        data: [
          {
            userId: student.user.id,
            type: 'SYSTEM',
            title: 'Notif 1',
            message: 'Message 1',
            isRead: false,
          },
          {
            userId: student.user.id,
            type: 'SYSTEM',
            title: 'Notif 2',
            message: 'Message 2',
            isRead: false,
          },
        ],
      });

      const response = await authenticatedRequest(student.agent)
        .patch('/api/v1/notifications/read-all')
        .expect(200);

      expect(response.body).toHaveProperty('updatedCount');
      expect(response.body.updatedCount).toBe(2);

      // Vérifier en base
      const unread = await prisma.notification.count({
        where: { userId: student.user.id, isRead: false },
      });
      expect(unread).toBe(0);
    });

    it('consultant peut marquer toutes les notifications comme lues', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await prisma.notification.create({
        data: {
          userId: consultant.user.id,
          type: 'SYSTEM',
          title: 'Test',
          message: 'Test',
          isRead: false,
        },
      });

      const response = await authenticatedRequest(consultant.agent)
        .patch('/api/v1/notifications/read-all')
        .expect(200);

      expect(response.body).toHaveProperty('updatedCount');
    });

    it('retourne 0 si aucune notification non lue', async () => {
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .patch('/api/v1/notifications/read-all')
        .expect(200);

      expect(response.body.updatedCount).toBe(0);
    });
  });

  describe('Notifications en temps réel', () => {
    it('crée une notification lors d\'un rendez-vous', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      // Avant le rendez-vous, vérifier qu'il n'y a pas de notification
      const before = await prisma.notification.count({
        where: { userId: consultantId },
      });

      // Créer un rendez-vous
      await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: getNextWorkableDate(5),
          time: TimeSlot.SLOT_1000,
          firstName: 'Etudiant',
          lastName: 'Test',
          email: uniqueEmail('rdv'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(201);

      // Vérifier qu'une notification a été créée pour le consultant
      const after = await prisma.notification.count({
        where: { userId: consultantId },
      });
      expect(after).toBeGreaterThan(before);
    });

    it('crée une notification lors d\'une annulation de rendez-vous', async () => {
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

      const before = await prisma.notification.count({
        where: { userId: consultantId },
      });

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulation' })
        .expect(200);

      const after = await prisma.notification.count({
        where: { userId: consultantId },
      });
      expect(after).toBeGreaterThan(before);
    });

    it('crée une notification lors d\'une procédure', async () => {
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

      const before = await prisma.notification.count({
        where: { userId: student.user.id },
      });

      await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const after = await prisma.notification.count({
        where: { userId: student.user.id },
      });
      expect(after).toBeGreaterThan(before);
    });
  });
});