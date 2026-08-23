// test/e2e/users-comprehensive.e2e-spec.ts
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
  createTestImageBuffer,
  setupStandardUsers,
  TEST_PASSWORD,
} from '../helpers/fixtures.helper';

describe('UsersController (e2e) — complémentaire', () => {
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

  describe('Mise à jour du profil', () => {
    it('PUT /users/me — valide une adresse email invalide', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ email: 'email-pas-valide' })
        .expect(400);
    });

    it('PUT /users/me — rejette un email déjà utilisé', async () => {
      const { student } = await setupStandardUsers(app);
      const otherStudent = await createStudentSession(app, 'duplicate-email');

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ email: otherStudent.user.email })
        .expect(409);
    });
  });

  describe('Photo de profil', () => {
    it('PUT /users/me/photo — téléverse une photo de profil', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', createTestImageBuffer(), 'profile.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();

      const profile = await authenticatedRequest(student.agent)
        .get('/api/v1/users/me')
        .expect(200);

      expect(profile.body.photo).toBeTruthy();
    });

    it('rejette le téléversement de photo sans authentification', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/me/photo')
        .attach('photo', createTestImageBuffer(), 'profile.jpg')
        .expect(401);
    });

    it('un étudiant ne peut pas téléverser la photo consultant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/consultant/photo')
        .attach('photo', createTestImageBuffer(), 'profile.jpg')
        .expect(403);
    });
  });

  describe('Profil public consultant', () => {
    it('GET /users/consultant/:id/public — profil public', async () => {
      const { consultantId } = await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      expect(response.body.id).toBe(consultantId);
      expect(response.body.firstName).toBeDefined();
      expect(response.body.lastName).toBeDefined();
      expect(Array.isArray(response.body.destinations)).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(Array.isArray(response.body.reviews)).toBe(true);
    });
  });

  describe('Gestion du compte', () => {
    it('PATCH /users/:id/promote-to-consultant — promeut un étudiant', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const student = await createStudentSession(app, 'promote');

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${student.user.id}/promote-to-consultant`)
        .expect(200);

      expect(response.body.role).toBe(UserRole.CONSULTANT);
    });

    it('PATCH /users/:id/status — active/désactive un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
        });

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('DELETE /users/:id puis restore — cycle suppression/restauration', async () => {
      const admin = await loginAs(
        app,
        process.env.ADMIN_EMAIL!,
        process.env.ADMIN_PASSWORD!,
      );
      const consultant = await createConsultantViaAdmin(app, admin.agent, 'cycle');

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200);

      const afterDelete = await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultant.user.id}`)
        .expect(200);

      expect(afterDelete.body.isDeleted).toBe(true);

      const restored = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultant.user.id}/restore`)
        .expect(200);

      expect(restored.body.isDeleted).toBe(false);
    });

    it('POST /users/:id/reset-password — réinitialise le mot de passe', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/users/${consultantId}/reset-password`)
        .send({ newPassword: 'NouveauMdp@12345678' })
        .expect(200);
    });
  });

  describe('Sessions', () => {
    it('POST /users/admin/logout-all-users — déconnecte tous les utilisateurs', async () => {
      const { admin } = await setupStandardUsers(app);
      await createStudentSession(app, 'logout-all');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/users/admin/logout-all-users')
        .expect(200);

      expect(response.body).toHaveProperty('affectedUsersCount');
    });

    it('DELETE /users/:id/sessions/:sessionId — révoque une session par un admin', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app, 'session-revoke');

      const session = await prisma.session.findFirst({
        where: { userId: student.user.id, isActive: true },
      });
      expect(session).toBeDefined();

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${student.user.id}/sessions/${session.id}`)
        .expect(200);

      const revoked = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(revoked.isActive).toBe(false);
    });

    it('GET /users/me/sessions — liste les sessions actives', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/users/me/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Rôles et accès', () => {
    it('un étudiant ne peut pas accéder à la liste des utilisateurs', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users')
        .expect(403);
    });
  });
});
