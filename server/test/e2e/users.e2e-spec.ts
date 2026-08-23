// test/e2e/users.e2e-spec.ts
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

  describe('Routes admin', () => {
    it('GET /api/v1/users — liste paginée', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .expect(200)
        .expect((res) => {
          expect(res.body.items || res.body.data).toBeTruthy();
        });
    });

    it('GET /api/v1/users/stats — statistiques', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeDefined();
          expect(res.body.byRole).toBeDefined();
        });
    });

    it('GET /api/v1/users/role/:role — filtre par rôle', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/role/${UserRole.CONSULTANT}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('POST /api/v1/users — crée un consultant', async () => {
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
    });

    it('GET /api/v1/users/:id — détail utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(consultantId);
        });
    });

    it('PUT /api/v1/users/:id — met à jour un utilisateur', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/users/${consultantId}`)
        .send({ firstName: 'ConsultantModifie' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('ConsultantModifie');
        });
    });

    it('PATCH /api/v1/users/:id/promote-to-consultant', async () => {
      const { admin } = await setupStandardUsers(app);
      const student = await createStudentSession(app, 'promote');

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${student.user.id}/promote-to-consultant`)
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(UserRole.CONSULTANT);
        });
    });

    it('PATCH /api/v1/users/:id/status — active/désactive', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: false })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultantId}/status`)
        .send({ isActive: true })
        .expect(200);
    });

    it('POST /api/v1/users/:id/reset-password', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/users/${consultantId}/reset-password`)
        .send({ newPassword: 'ResetConsult@12345678' })
        .expect(200);
    });

    it('DELETE /api/v1/users/:id — soft delete', async () => {
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
        .expect(200);
    });

    it('PATCH /api/v1/users/:id/restore — restaure un utilisateur', async () => {
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

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultant.user.id}`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${consultant.user.id}/restore`)
        .expect(200);
    });

    it('GET /api/v1/users/:id/login-history', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${consultantId}/login-history`)
        .expect(200);
    });

    it('POST /api/v1/users/admin/logout-all-users', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users/admin/logout-all-users')
        .expect(200);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users')
        .expect(403);
    });
  });

  describe('Profil personnel', () => {
    it('GET /api/v1/users/me — profil courant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(student.user.id);
        });
    });

    it('PUT /api/v1/users/me — met à jour le profil', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ firstName: 'PrenomModifie' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('PrenomModifie');
        });
    });

    it('GET /api/v1/users/me/sessions — sessions actives', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/me/sessions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Routes publiques consultant', () => {
    it('GET /api/v1/users/consultants — liste semi-publique', async () => {
      await setupStandardUsers(app);

      await request(app.getHttpServer())
        .get('/api/v1/users/consultants')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/v1/users/consultant/:id/public — profil public', async () => {
      const { consultantId } = await setupStandardUsers(app);

      await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);
    });

    it('GET /api/v1/users/consultant/me — profil consultant', async () => {
      const { consultant } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/users/consultant/me')
        .expect(200);
    });

    it('GET /api/v1/users/consultant/:id/students — étudiants du consultant', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get(`/api/v1/users/consultant/${consultantId}/students`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});