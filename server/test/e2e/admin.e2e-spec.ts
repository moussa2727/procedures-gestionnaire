// test/e2e/13-admin.e2e-spec.ts
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
  setupStandardUsers,
  TEST_PASSWORD,
  createConsultantViaAdmin,
  createStudentSession,
} from '../helpers/fixtures.helper';

describe('Admin Routes (e2e)', () => {
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

  describe('GET /api/v1/users/stats - Statistiques', () => {
    it('retourne les statistiques utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.byRole).toBeDefined();
      expect(response.body.byRole.ETUDIANT).toBeDefined();
      expect(response.body.byRole.CONSULTANT).toBeDefined();
      expect(response.body.byRole.ADMIN).toBeDefined();
      expect(response.body.active).toBeDefined();
      expect(response.body.inactive).toBeDefined();
      expect(response.body.online).toBeDefined();
      expect(response.body.newThisMonth).toBeDefined();
      expect(response.body.newThisWeek).toBeDefined();
      expect(response.body.generatedAt).toBeDefined();
    });

    it('utilise le cache Redis', async () => {
      const { admin } = await setupStandardUsers(app);

      // Vider le cache
      await redisService.getClient().del('users:stats');

      // Première requête - remplit le cache
      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);

      // Vérifier que le cache est rempli
      const cached = await redisService.getClient().get('users:stats');
      expect(cached).toBeDefined();

      // Deuxième requête - utilise le cache
      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);

      expect(response.body.total).toBeDefined();
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/stats')
        .expect(403);
    });
  });

  describe('GET /api/v1/users/role/:role - Filtrer par rôle', () => {
    it('filtre les consultants', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.CONSULTANT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body.every((u: any) => u.role === UserRole.CONSULTANT)).toBe(true);
      }
    });

    it('filtre les étudiants', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.ETUDIANT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body.every((u: any) => u.role === UserRole.ETUDIANT)).toBe(true);
      }
    });

    it('filtre les admins', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.ADMIN}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body.every((u: any) => u.role === UserRole.ADMIN)).toBe(true);
      }
    });
  });

  describe('POST /api/v1/users - Création d\'utilisateurs', () => {
    it('crée un consultant', async () => {
      const { admin } = await setupStandardUsers(app);
      const email = uniqueEmail('admin-create-consultant');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'AdminCreated',
          lastName: 'Consultant',
          role: UserRole.CONSULTANT,
        })
        .expect(201);

      expect(response.body.email).toBe(email);
      expect(response.body.role).toBe(UserRole.CONSULTANT);
      expect(response.body.isActive).toBe(true);
    });

    it('crée un étudiant', async () => {
      const { admin } = await setupStandardUsers(app);
      const email = uniqueEmail('admin-create-student');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'AdminCreated',
          lastName: 'Student',
          role: UserRole.ETUDIANT,
        })
        .expect(201);

      expect(response.body.role).toBe(UserRole.ETUDIANT);
    });

    it('crée un utilisateur inactif', async () => {
      const { admin } = await setupStandardUsers(app);
      const email = uniqueEmail('admin-inactive');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Inactive',
          lastName: 'User',
          role: UserRole.ETUDIANT,
          isActive: false,
        })
        .expect(201);

      expect(response.body.isActive).toBe(false);
    });

    it('rejette un email déjà utilisé', async () => {
      const { admin } = await setupStandardUsers(app);
      const email = uniqueEmail('admin-duplicate');

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'First',
          lastName: 'User',
          role: UserRole.ETUDIANT,
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Second',
          lastName: 'User',
          role: UserRole.ETUDIANT,
        })
        .expect(409);
    });

    it('rejette l\'email admin réservé', async () => {
      const { admin } = await setupStandardUsers(app);
      const adminEmail = process.env.ADMIN_EMAIL!;

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email: adminEmail,
          password: TEST_PASSWORD,
          firstName: 'Hacker',
          lastName: 'Test',
          role: UserRole.ETUDIANT,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/users/:id - Détail utilisateur', () => {
    it('récupère un utilisateur par ID', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}`)
        .expect(200);

      expect(response.body.id).toBe(consultantId);
      expect(response.body.email).toBeDefined();
      expect(response.body.firstName).toBeDefined();
      expect(response.body.lastName).toBeDefined();
      expect(response.body.role).toBeDefined();
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PUT /api/v1/users/:id - Mise à jour utilisateur', () => {
    it('met à jour un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ firstName: 'UpdatedName' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('UpdatedName');
        });
    });

    it('met à jour l\'email', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const newEmail = uniqueEmail('updated-email');

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ email: newEmail })
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(newEmail);
        });
    });

    it('rejette un email déjà utilisé', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app);

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${student.user.id}`)
        .send({ email: process.env.ADMIN_EMAIL! })
        .expect(409);
    });

    it('refuse de modifier l\'admin via cette route', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${admin.user.id}`)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id/promote-to-consultant', () => {
    it('promet un étudiant en consultant', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app, 'promote');

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${student.user.id}/promote-to-consultant`)
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(UserRole.CONSULTANT);
        });
    });

    it('rejette si l\'utilisateur est déjà consultant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/promote-to-consultant`)
        .expect(400);
    });

    it('rejette si l\'utilisateur est admin', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${admin.user.id}/promote-to-consultant`)
        .expect(400);
    });
  });

  describe('PATCH /api/v1/users/:id/status', () => {
    it('désactive un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
        });
    });

    it('réactive un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: false })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: true })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(true);
        });
    });

    it('refuse de désactiver l\'admin', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${admin.user.id}/status`)
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id/restore', () => {
    it('restaure un utilisateur supprimé', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(
        app,
        admin.agent,
        'restore',
      );

      // Soft delete
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200);

      // Restaurer
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultant.user.id}/restore`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isDeleted).toBe(false);
        });
    });

    it('retourne 404 si l\'utilisateur n\'est pas supprimé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/restore`)
        .expect(404);
    });
  });

  describe('POST /api/v1/users/:id/reset-password', () => {
    it('réinitialise le mot de passe', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const newPassword = 'ResetConsult@12345678';

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/users/${consultantId}/reset-password`)
        .send({ newPassword })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Mot de passe réinitialisé avec succès');
        });

      const user = await prisma.user.findUnique({ where: { id: consultantId } });
      await loginAs(app, user!.email, newPassword);
    });

    it('refuse de réinitialiser le mot de passe admin', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/users/${admin.user.id}/reset-password`)
        .send({ newPassword: 'HackAdmin@123' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('soft delete un utilisateur', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(
        app,
        admin.agent,
        'delete',
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Utilisateur supprimé avec succès');
        });

      const user = await prisma.user.findUnique({ where: { id: consultant.user.id } });
      expect(user?.isDeleted).toBe(true);
      expect(user?.deletedAt).toBeDefined();
    });

    it('refuse de supprimer l\'admin', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${admin.user.id}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/users/admin/logout-all-users', () => {
    it('déconnecte tous les utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      // Créer des sessions pour plusieurs utilisateurs
      const student1 = await createStudentSession(app, 'logout-1');
      const student2 = await createStudentSession(app, 'logout-2');

      const sessionsBefore = await prisma.session.findMany({
        where: { isActive: true },
      });
      expect(sessionsBefore.length).toBeGreaterThanOrEqual(2);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users/admin/logout-all-users')
        .expect(200)
        .expect((res) => {
          expect(res.body.affectedUsersCount).toBeDefined();
        });

      const sessionsAfter = await prisma.session.findMany({
        where: { isActive: true },
      });
      // Seule la session admin devrait rester
      expect(sessionsAfter.length).toBeLessThan(sessionsBefore.length);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/users/admin/logout-all-users')
        .expect(403);
    });
  });

  describe('GET /api/v1/users/:id/login-history', () => {
    it('récupère l\'historique des connexions', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      // Créer quelques connexions
      const user = await prisma.user.findUnique({ where: { id: consultantId } });
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: user!.email, password: TEST_PASSWORD });
      }

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}/login-history`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
    });

    it('paginate l\'historique', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const user = await prisma.user.findUnique({ where: { id: consultantId } });

      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: user!.email, password: TEST_PASSWORD });
      }

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}/login-history`)
        .query({ page: 2, limit: 3 })
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(3);
      expect(response.body.items.length).toBeLessThanOrEqual(3);
    });
  });

  describe('DELETE /api/v1/users/:id/sessions/:sessionId', () => {
    it('admin révoque une session d\'un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const user = await prisma.user.findUnique({ where: { id: consultantId } });

      // Créer une session
      await loginAs(app, user!.email, TEST_PASSWORD);

      const sessions = await prisma.session.findMany({
        where: { userId: consultantId, isActive: true },
      });
      expect(sessions.length).toBeGreaterThan(0);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultantId}/sessions/${sessions[0].id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Session révoquée avec succès');
        });

      const sessionsAfter = await prisma.session.findMany({
        where: { userId: consultantId, isActive: true },
      });
      expect(sessionsAfter.length).toBe(0);
    });

    it('refuse de révoquer la session admin', async () => {
      const { admin } = await setupStandardUsers(app);

      const sessions = await prisma.session.findMany({
        where: { userId: admin.user.id, isActive: true },
      });

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${admin.user.id}/sessions/${sessions[0].id}`)
        .expect(403);
    });
  });
});