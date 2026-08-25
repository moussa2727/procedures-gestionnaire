// test/e2e/02-users.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from '@prisma/client';
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
  setupStandardUsers,
  TEST_PASSWORD,
} from '../helpers/fixtures.helper';

describe('UsersController (e2e)', () => {
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

  describe('Routes admin - GET /api/v1/users', () => {
    it('liste paginée des utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.items || response.body.data).toBeDefined();
      expect(Array.isArray(response.body.items || response.body.data)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBeDefined();
      expect(response.body.limit).toBeDefined();
      expect(response.body.totalPages).toBeDefined();
    });

    it('filtre par rôle', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .query({ role: UserRole.CONSULTANT })
        .expect(200);

      const items = response.body.items || response.body.data;
      expect(Array.isArray(items)).toBe(true);
      if (items.length > 0) {
        expect(items.every((u: any) => u.role === UserRole.CONSULTANT)).toBe(true);
      }
    });

    it('filtre par statut actif', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .query({ isActive: true })
        .expect(200);

      const items = response.body.items || response.body.data;
      expect(Array.isArray(items)).toBe(true);
      if (items.length > 0) {
        expect(items.every((u: any) => u.isActive === true)).toBe(true);
      }
    });

    it('recherche par email', async () => {
      const { admin } = await setupStandardUsers(app);
      const email = process.env.ADMIN_EMAIL!;

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .query({ search: email.split('@')[0] })
        .expect(200);

      const items = response.body.items || response.body.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.some((u: any) => u.email === email)).toBe(true);
    });

    it('trie par date de création', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .query({ sortBy: 'createdAt', sortOrder: 'asc' })
        .expect(200);

      const items = response.body.items || response.body.data;
      expect(Array.isArray(items)).toBe(true);
      if (items.length > 1) {
        const dates = items.map((u: any) => new Date(u.createdAt).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => a - b));
      }
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get('/api/v1/users')
        .expect(403);
    });
  });

  describe('GET /api/v1/users/stats', () => {
    it('retourne les statistiques utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.byRole).toBeDefined();
          expect(res.body.byRole.ETUDIANT).toBeDefined();
          expect(res.body.byRole.CONSULTANT).toBeDefined();
          expect(res.body.byRole.ADMIN).toBeDefined();
          expect(res.body.active).toBeDefined();
          expect(res.body.inactive).toBeDefined();
          expect(res.body.online).toBeDefined();
          expect(res.body.newThisMonth).toBeDefined();
          expect(res.body.newThisWeek).toBeDefined();
          expect(res.body.generatedAt).toBeDefined();
        });
    });

    it('utilise le cache Redis', async () => {
      const { admin } = await setupStandardUsers(app);

      // Première requête - remplit le cache
      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);

      // Deuxième requête - utilise le cache
      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get('/api/v1/users/stats')
        .expect(403);
    });
  });

  describe('GET /api/v1/users/role/:role', () => {
    it('filtre les utilisateurs par rôle', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.CONSULTANT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body.every((u: any) => u.role === UserRole.CONSULTANT)).toBe(true);
      }
    });

    it('retourne une liste vide pour un rôle sans utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);

      // Nettoyer tous les utilisateurs du rôle (sauf admin)
      await prisma.user.deleteMany({
        where: { role: { not: UserRole.ADMIN } },
      });

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.CONSULTANT}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get(`/api/v1/users/role/${UserRole.CONSULTANT}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/users', () => {
    it('crée un consultant', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const email = uniqueEmail('new-consultant');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Nouveau',
          lastName: 'Consultant',
          role: UserRole.CONSULTANT,
        })
        .expect(201);

      expect(response.body.email).toBe(email);
      expect(response.body.role).toBe(UserRole.CONSULTANT);
      expect(response.body.isActive).toBe(true);

      // Vérifier que l'utilisateur existe en base
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeDefined();
      expect(user?.role).toBe(UserRole.CONSULTANT);
    });

    it('crée un étudiant', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const email = uniqueEmail('new-student');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Nouveau',
          lastName: 'Étudiant',
          role: UserRole.ETUDIANT,
        })
        .expect(201);

      expect(response.body.role).toBe(UserRole.ETUDIANT);
    });

    it('crée un utilisateur inactif', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const email = uniqueEmail('inactive-user');

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

    it('rejette un email déjà existant', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const email = uniqueEmail('existing-user');

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Existing',
          lastName: 'User',
          role: UserRole.ETUDIANT,
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Duplicate',
          lastName: 'User',
          role: UserRole.ETUDIANT,
        })
        .expect(409);
    });

    it('rejette l\'email admin réservé', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
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

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);
      const email = uniqueEmail('unauthorized');

      await authenticatedRequest(student.agent)
        .post('/api/v1/users')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Unauthorized',
          lastName: 'User',
          role: UserRole.ETUDIANT,
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('récupère un utilisateur par ID', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(consultantId);
          expect(res.body.email).toBeDefined();
          expect(res.body.firstName).toBeDefined();
          expect(res.body.lastName).toBeDefined();
          expect(res.body.role).toBeDefined();
        });
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student, consultantId } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get(`/api/v1/users/${consultantId}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('met à jour un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ firstName: 'ConsultantModifie' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('ConsultantModifie');
        });

      // Vérifier la mise à jour en base
      const user = await prisma.user.findUnique({ where: { id: consultantId } });
      expect(user?.firstName).toBe('ConsultantModifie');
    });

    it('met à jour l\'email', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const newEmail = uniqueEmail('updated');

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ email: newEmail })
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(newEmail);
        });

      const user = await prisma.user.findUnique({ where: { id: consultantId } });
      expect(user?.email).toBe(newEmail);
    });

    it('rejette un email déjà utilisé', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app);

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${student.user.id}`)
        .send({ email: process.env.ADMIN_EMAIL! })
        .expect(409);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student, consultantId } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ firstName: 'Hack' })
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

      const user = await prisma.user.findUnique({ where: { id: student.user.id } });
      expect(user?.role).toBe(UserRole.CONSULTANT);
    });

    it('rejette si l\'utilisateur est déjà consultant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/promote-to-consultant`)
        .expect(400);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);
      const otherStudent = await createStudentSession(app);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/users/${otherStudent.user.id}/promote-to-consultant`)
        .expect(403);
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

      const user = await prisma.user.findUnique({ where: { id: consultantId } });
      expect(user?.isActive).toBe(false);
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

    it('révoque les sessions lors de la désactivation', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      // Créer une session
      await loginAs(app, 
        (await prisma.user.findUnique({ where: { id: consultantId } }))!.email,
        TEST_PASSWORD
      );

      const sessionsBefore = await prisma.session.findMany({
        where: { userId: consultantId, isActive: true },
      });
      expect(sessionsBefore.length).toBeGreaterThan(0);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: false })
        .expect(200);

      const sessionsAfter = await prisma.session.findMany({
        where: { userId: consultantId, isActive: true },
      });
      expect(sessionsAfter.length).toBe(0);
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
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
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

      const user = await prisma.user.findUnique({ where: { id: consultant.user.id } });
      expect(user?.isDeleted).toBe(false);
      expect(user?.deletedAt).toBeNull();
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
      const consultant = await loginAs(app, user!.email, newPassword);
      expect(consultant.user.id).toBe(consultantId);
    });

    it('révoque les sessions après réinitialisation', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const user = await prisma.user.findUnique({ where: { id: consultantId } });

      // Créer une session
      await loginAs(app, user!.email, TEST_PASSWORD);

      const sessionsBefore = await prisma.session.findMany({
        where: { userId: consultantId, isActive: true },
      });
      expect(sessionsBefore.length).toBeGreaterThan(0);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/users/${consultantId}/reset-password`)
        .send({ newPassword: 'NewPassword@123' })
        .expect(200);

      const sessionsAfter = await prisma.session.findMany({
        where: { userId: consultantId, isActive: true },
      });
      expect(sessionsAfter.length).toBe(0);
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
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
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
      expect(user?.isActive).toBe(false);
    });

    it('révoque les sessions après suppression', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const consultant = await createConsultantViaAdmin(
        app,
        admin.agent,
        'delete-session',
      );

      // Créer une session
      await loginAs(app, consultant.user.email, TEST_PASSWORD);

      const sessionsBefore = await prisma.session.findMany({
        where: { userId: consultant.user.id, isActive: true },
      });
      expect(sessionsBefore.length).toBeGreaterThan(0);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200);

      const sessionsAfter = await prisma.session.findMany({
        where: { userId: consultant.user.id, isActive: true },
      });
      expect(sessionsAfter.length).toBe(0);
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
      const student1 = await createStudentSession(app, 'logout-all-1');
      const student2 = await createStudentSession(app, 'logout-all-2');

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
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
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

    it('refuse l\'accès aux non-admins', async () => {
      const { student, consultantId } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get(`/api/v1/users/${consultantId}/login-history`)
        .expect(403);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('récupère son propre profil', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(student.user.id);
          expect(res.body.email).toBe(student.user.email);
          expect(res.body.firstName).toBeDefined();
          expect(res.body.lastName).toBeDefined();
          expect(res.body.role).toBeDefined();
        });
    });

    it('retourne 401 sans authentification', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('met à jour son propre profil', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ firstName: 'PrenomModifie' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('PrenomModifie');
        });

      const user = await prisma.user.findUnique({ where: { id: student.user.id } });
      expect(user?.firstName).toBe('PrenomModifie');
    });

    it('met à jour l\'email', async () => {
      const { student } = await setupStandardUsers(app);
      const newEmail = uniqueEmail('updated-me');

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ email: newEmail })
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(newEmail);
        });
    });

    it('rejette un email déjà utilisé', async () => {
      const { student } = await setupStandardUsers(app);
      const existingEmail = process.env.ADMIN_EMAIL!;

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ email: existingEmail })
        .expect(409);
    });

    it('retourne 401 sans authentification', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .send({ firstName: 'Hack' })
        .expect(401);
    });
  });

  describe('GET /api/v1/users/consultants', () => {
    it('liste les consultants de manière semi-publique', async () => {
      await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/consultants')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('firstName');
        expect(response.body[0]).toHaveProperty('lastName');
        expect(response.body[0]).toHaveProperty('photo');
        // Ne doit pas exposer l'email
        expect(response.body[0]).not.toHaveProperty('email');
      }
    });

    it('ne liste que les consultants actifs', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent, 'inactive-consultant');

      // Désactiver un consultant
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultant.user.id}/status`)
        .send({ isActive: false })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/consultants')
        .expect(200);

      // Le consultant inactif ne doit pas apparaître
      expect(response.body.some((c: any) => c.id === consultant.user.id)).toBe(false);
    });
  });

  describe('GET /api/v1/users/consultant/:id/public', () => {
    it('récupère le profil public d\'un consultant', async () => {
      const { consultantId } = await setupStandardUsers(app);

      await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(consultantId);
          expect(res.body.firstName).toBeDefined();
          expect(res.body.lastName).toBeDefined();
          expect(res.body.photo).toBeDefined();
          expect(res.body.destinations).toBeDefined();
          expect(Array.isArray(res.body.destinations)).toBe(true);
          expect(res.body.availability).toBeDefined();
          expect(Array.isArray(res.body.availability)).toBe(true);
          expect(res.body.stats).toBeDefined();
          expect(res.body.reviews).toBeDefined();
          expect(Array.isArray(res.body.reviews)).toBe(true);
        });
    });

    it('retourne 404 pour un consultant inexistant', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/consultant/00000000-0000-0000-0000-000000000000/public')
        .expect(404);
    });

    it('utilise le cache Redis', async () => {
      const { consultantId } = await setupStandardUsers(app);

      // Première requête - remplit le cache
      await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      // Deuxième requête - utilise le cache
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      expect(response.body.id).toBe(consultantId);
    });
  });

  describe('GET /api/v1/users/consultant/:id/students', () => {
    it('récupère les étudiants d\'un consultant', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);

      // Créer un rendez-vous pour lier un étudiant au consultant
      const { admin } = await setupStandardUsers(app);
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

      const response = await authenticatedRequest(consultant.agent)
        .get(`/api/v1/users/consultant/${consultantId}/students`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('firstName');
        expect(response.body[0]).toHaveProperty('lastName');
        expect(response.body[0]).toHaveProperty('email');
        expect(response.body[0]).toHaveProperty('photo');
      }
    });

    it('refuse l\'accès à un autre consultant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const otherConsultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(otherConsultant.agent)
        .get(`/api/v1/users/consultant/${consultantId}/students`)
        .expect(403);
    });

    it('refuse l\'accès à un étudiant', async () => {
      const { student, consultantId } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get(`/api/v1/users/consultant/${consultantId}/students`)
        .expect(403);
    });
  });

  describe('GET /api/v1/users/consultant/me', () => {
    it('récupère le profil consultant de l\'utilisateur', async () => {
      const { consultant } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/users/consultant/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(consultant.user.id);
          expect(res.body.role).toBe(UserRole.CONSULTANT);
        });
    });

    it('refuse l\'accès à un étudiant', async () => {
      const { student } = await setupStandardUsers(app);
      await authenticatedRequest(student.agent)
        .get('/api/v1/users/consultant/me')
        .expect(403);
    });
  });

  describe('DELETE /api/v1/users/:id/sessions/:sessionId', () => {
    it('admin révoque une session d\'un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const user = await prisma.user.findUnique({ where: { id: consultantId } });

      // Créer une session
      const session = await loginAs(app, user!.email, TEST_PASSWORD);

      // Récupérer l'ID de la session
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