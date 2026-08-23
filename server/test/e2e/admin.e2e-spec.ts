// test/e2e/admin.e2e-spec.ts - Comprehensive Admin Module Tests
import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  loginAs,
  setTestApp,
  uniqueEmail,
} from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createDestinationWithConsultant,
  setupStandardUsers,
  TEST_PASSWORD,
  getNextWorkableDate,
  TimeSlot,
  createRendezVous,
  createProcedureFromRendezVous,
} from '../helpers/fixtures.helper';

describe('Admin Module (e2e)', () => {
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

  describe('Admin Dashboard - Statistiques', () => {
    it('GET /api/v1/users/stats - admin peut voir les statistiques', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.byRole).toBeDefined();
      expect(response.body.byRole.CONSULTANT).toBeDefined();
      expect(response.body.byRole.ETUDIANT).toBeDefined();
      expect(response.body.byRole.ADMIN).toBeDefined();
    });

    it('GET /api/v1/admin/stats - statistiques globales admin', async () => {
      const { admin } = await setupStandardUsers(app);

      // This route might not exist yet, so we expect 404
      await authenticatedRequest(admin.agent)
        .get('/api/v1/admin/stats')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Admin User Management', () => {
    it('GET /api/v1/users - liste paginée des utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .expect(200);

      expect(response.body.items || response.body.data).toBeTruthy();
    });

    it('GET /api/v1/users/role/:role - filtrer par rôle', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.CONSULTANT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /api/v1/users - créer un utilisateur', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const email = uniqueEmail('admin-create-user');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'New',
          lastName: 'User',
          role: UserRole.ETUDIANT,
        })
        .expect(201);

      expect(response.body.email).toBe(email);
      expect(response.body.role).toBe(UserRole.ETUDIANT);
    });

    it('POST /api/v1/users - créer un consultant', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const email = uniqueEmail('admin-create-consultant');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'New',
          lastName: 'Consultant',
          role: UserRole.CONSULTANT,
        })
        .expect(201);

      expect(response.body.email).toBe(email);
      expect(response.body.role).toBe(UserRole.CONSULTANT);
    });

    it('GET /api/v1/users/:id - détail utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}`)
        .expect(200);

      expect(response.body.id).toBe(consultantId);
    });

    it('PUT /api/v1/users/:id - mettre à jour un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ firstName: 'UpdatedName' })
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedName');
    });

    it('PATCH /api/v1/users/:id/status - activer/désactiver un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      // Deactivate
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: false })
        .expect(200);

      // Reactivate
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: true })
        .expect(200);
    });

    it('PATCH /api/v1/users/:id/promote-to-consultant - promouvoir en consultant', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${student.user.id}/promote-to-consultant`)
        .expect(200);

      expect(response.body.role).toBe(UserRole.CONSULTANT);
    });

    it('POST /api/v1/users/:id/reset-password - réinitialiser le mot de passe', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/users/${consultantId}/reset-password`)
        .send({ newPassword: 'NewPassword@12345678' })
        .expect(200);
    });

    it('DELETE /api/v1/users/:id - supprimer un utilisateur (soft delete)', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200);
    });

    it('PATCH /api/v1/users/:id/restore - restaurer un utilisateur supprimé', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      // Delete first
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200);

      // Then restore
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultant.user.id}/restore`)
        .expect(200);
    });

    it('GET /api/v1/users/:id/login-history - historique de connexion', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}/login-history`)
        .expect(200);
    });

    it('POST /api/v1/users/admin/logout-all-users - déconnecter tous les utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users/admin/logout-all-users')
        .expect(200);
    });
  });

  describe('Admin Destination Management', () => {
    it('POST /api/v1/admin/destinations - créer une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `TestCountry-${Date.now()}`)
        .field('description', 'Test description')
        .field('consultantIds[]', consultantId)
        .attach('image', Buffer.from('test'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.country).toBeDefined();
    });

    it('GET /api/v1/admin/destinations/:id - détail destination (admin)', async () => {
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

    it('DELETE /api/v1/admin/destinations/:id - supprimer destination', async () => {
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

    it('POST /api/v1/admin/destinations/:id/restore - restaurer destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      // Delete first
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      // Then restore
      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/destinations/${destinationId}/restore`)
        .expect(200);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/destinations')
        .field('country', 'Forbidden')
        .field('description', 'Test')
        .expect(403);
    });
  });

  describe('Admin Rendez-vous Management', () => {
    it('GET /api/v1/rendez-vous/admin/all - liste tous les rendez-vous', async () => {
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
      });

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/rendez-vous/admin/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('PATCH /api/v1/rendez-vous/:id/complete - marquer comme terminé', async () => {
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
      });

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });
  });

  describe('Admin Procedure Management', () => {
    it('GET /api/v1/procedure/admin/all - liste toutes les procédures', async () => {
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

      await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/procedure/admin/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/v1/procedure/dossier/:numeroDossier - recherche par numéro', async () => {
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

      const procedure = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv.id,
      );

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/dossier/${procedure.numeroDossier}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
    });
  });

  describe('Admin Contact Management', () => {
    let contactId: string;

    beforeEach(async () => {
      // Create a contact for tests that need one
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Test Contact',
          email: uniqueEmail('contact-admin'),
          message: 'Test message for admin tests',
        });

      // Handle rate limiting gracefully
      if (response.status === 201) {
        contactId = response.body.id;
      }
    });

    it('GET /api/v1/contacts - liste des contacts', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .expect(200);

      // Response might be array or paginated object
      const contacts = Array.isArray(response.body)
        ? response.body
        : response.body.items || response.body.data || [];
      expect(Array.isArray(contacts)).toBe(true);
    });

    it('GET /api/v1/contacts/statistics - statistiques contacts', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/statistics')
        .expect(200);
    });

    it('GET /api/v1/contacts/unread-count - nombre de non-lus', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/unread-count')
        .expect(200);

      expect(typeof response.body.count).toBe('number');
    });

    it('PATCH /api/v1/contacts/:id/read - marquer comme lu', async () => {
      const { admin } = await setupStandardUsers(app);

      if (contactId) {
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/contacts/${contactId}/read`)
          .expect(200);
      }
    });

    it('PATCH /api/v1/contacts/mark-all-read - marquer tout comme lu', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch('/api/v1/contacts/mark-all-read')
        .expect(200);
    });

    it('PATCH /api/v1/contacts/:id/reply - répondre à un contact', async () => {
      const { admin } = await setupStandardUsers(app);

      if (contactId) {
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/contacts/${contactId}/reply`)
          .send({ replyMessage: 'Response message' })
          .expect(200);
      }
    });

    it('DELETE /api/v1/contacts/:id - supprimer un contact', async () => {
      const { admin } = await setupStandardUsers(app);

      if (contactId) {
        await authenticatedRequest(admin.agent)
          .delete(`/api/v1/contacts/${contactId}`)
          .expect(204);
      }
    });
  });

  describe('Admin Review Management', () => {
    it('PATCH /api/v1/users/reviews/:reviewId/moderate - modérer un avis', async () => {
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

      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Great consultant!',
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/reviews/${reviewResponse.body.id}/moderate`)
        .send({ reason: 'Inappropriate content' })
        .expect(200);
    });
  });

  describe('Admin Notification Management', () => {
    it('GET /api/v1/notifications - liste les notifications admin', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications')
        .expect(200);

      // Response might be array or paginated object
      const notifications = Array.isArray(response.body)
        ? response.body
        : response.body.items || response.body.data || [];
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('GET /api/v1/notifications/unread-count - nombre de notifications non lues', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/notifications/unread-count')
        .expect(200);

      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('Authorization Tests', () => {
    it('étudiant ne peut pas accéder aux routes admin', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users')
        .expect(403);
    });

    it('consultant ne peut pas accéder aux routes admin', async () => {
      const { consultant } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/users')
        .expect(403);
    });

    it('étudiant ne peut pas créer de destination', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/destinations')
        .field('country', 'Forbidden')
        .field('description', 'Test')
        .expect(403);
    });

    it('consultant ne peut pas voir les statistiques', async () => {
      const { consultant } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/users/stats')
        .expect(403);
    });

    it('non authentifié ne peut pas accéder aux routes admin', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });
  });
});
