// test/e2e/auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  loginAs,
  registerStudent,
  setTestApp,
  uniqueEmail,
} from '../helpers/auth.helper';
import { TEST_PASSWORD } from '../helpers/fixtures.helper';

describe('AuthController (e2e)', () => {
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

  describe('POST /api/v1/auth/register', () => {
    it('crée un compte étudiant', async () => {
      const email = uniqueEmail('register');

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Jean',
          lastName: 'Dupont',
          phone: '0600000000',
        })
        .expect(201);

      expect(response.body.email).toBe(email);
      expect(response.body.role).toBe('ETUDIANT');
      expect(response.body.isActive).toBe(true);
    });

    it('rejette un email invalide', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: TEST_PASSWORD,
          firstName: 'Jean',
          lastName: 'Dupont',
        })
        .expect(400);
    });

    it('rejette un mot de passe trop court', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail('short-pwd'),
          password: 'short',
          firstName: 'Jean',
          lastName: 'Dupont',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('connecte un utilisateur et pose les cookies', async () => {
      const email = uniqueEmail('login');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Marie',
        lastName: 'Martin',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(200);

      expect(response.body.email).toBe(email);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('rejette des identifiants invalides', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@e2e.local',
          password: TEST_PASSWORD,
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('renouvelle la session avec le refresh token', async () => {
      const email = uniqueEmail('refresh');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Paul',
        lastName: 'Durand',
      });

      const login = await loginAs(app, email, TEST_PASSWORD);

      await authenticatedRequest(login.agent)
        .post('/api/v1/auth/refresh')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('déconnecte l\'utilisateur authentifié', async () => {
      const email = uniqueEmail('logout');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Luc',
        lastName: 'Bernard',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);

      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/logout')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('retourne 401 sans authentification', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('révoque toutes les sessions', async () => {
      const email = uniqueEmail('logout-all');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Emma',
        lastName: 'Petit',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);

      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/logout-all')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('accepte une demande même si l\'email est inconnu', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown@e2e.local' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Si un compte existe');
        });
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('modifie le mot de passe de l\'utilisateur connecté', async () => {
      const email = uniqueEmail('change-pwd');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Nina',
        lastName: 'Roux',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);
      const newPassword = 'NewTestUser@87654321';

      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword,
        })
        .expect(200);

      await loginAs(app, email, newPassword);
    });
  });
});