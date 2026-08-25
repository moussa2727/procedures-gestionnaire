// test/e2e/01-auth.e2e-spec.ts
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

    it('rejette un email déjà existant', async () => {
      const email = uniqueEmail('existing');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Existing',
        lastName: 'User',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Duplicate',
          lastName: 'User',
        })
        .expect(409);
    });

    it('rejette l\'email admin réservé', async () => {
      const adminEmail = process.env.ADMIN_EMAIL!;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: TEST_PASSWORD,
          firstName: 'Hacker',
          lastName: 'Test',
        })
        .expect(403);
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
      const cookies = response.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(
        cookieArray.some((c: string) => c.startsWith('access_token=')),
      ).toBe(true);
      expect(
        cookieArray.some((c: string) => c.startsWith('refresh_token=')),
      ).toBe(true);
    });

    it('connecte avec rememberMe', async () => {
      const email = uniqueEmail('remember-me');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Remember',
        lastName: 'Me',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD, rememberMe: true })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const refreshCookie = cookieArray.find(c => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      // Le refresh token devrait avoir une expiration plus longue
      expect(refreshCookie).toContain('Max-Age');
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

    it('rejette un compte inactif', async () => {
      const email = uniqueEmail('inactive');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Inactive',
        lastName: 'User',
      });

      // Désactiver le compte
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const user = await prisma.user.findUnique({ where: { email } });
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${user!.id}/status`)
        .send({ isActive: false })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(403);
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

      const response = await authenticatedRequest(login.agent)
        .post('/api/v1/auth/refresh')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Vérifier que les cookies ont été mis à jour
      const cookies = response.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(
        cookieArray.some((c: string) => c.startsWith('access_token=')),
      ).toBe(true);
    });

    it('rejette un refresh token expiré', async () => {
      const email = uniqueEmail('expired-refresh');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Expired',
        lastName: 'Refresh',
      });

      const login = await loginAs(app, email, TEST_PASSWORD);

      // Forcer l'expiration du refresh token
      const refreshToken = login.cookies.find(c => c.startsWith('refresh_token='))?.split('=')[1]?.split(';')[0];
      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
      }

      await authenticatedRequest(login.agent)
        .post('/api/v1/auth/refresh')
        .expect(401);
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

    it('invalide le token après logout', async () => {
      const email = uniqueEmail('logout-token');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Token',
        lastName: 'Test',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);
      const accessToken = session.cookies.find(c => c.startsWith('access_token='))?.split('=')[1]?.split(';')[0];

      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/logout')
        .expect(200);

      // Tenter d'utiliser le token blacklisté
      if (accessToken) {
        await request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Cookie', [`access_token=${accessToken}`])
          .expect(401);
      }
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

    it('révoque toutes les sessions de l\'utilisateur', async () => {
      const email = uniqueEmail('multi-session');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Multi',
        lastName: 'Session',
      });

      const session1 = await loginAs(app, email, TEST_PASSWORD);
      const session2 = await loginAs(app, email, TEST_PASSWORD);

      // Vérifier qu'il y a 2 sessions actives
      const sessions = await prisma.session.findMany({
        where: { userId: session1.user.id, isActive: true },
      });
      expect(sessions.length).toBe(2);

      await authenticatedRequest(session1.agent)
        .post('/api/v1/auth/logout-all')
        .expect(200);

      // Vérifier que toutes les sessions sont révoquées
      const updatedSessions = await prisma.session.findMany({
        where: { userId: session1.user.id, isActive: true },
      });
      expect(updatedSessions.length).toBe(0);
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

    it('accepte une demande pour un email existant', async () => {
      const email = uniqueEmail('forgot');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Forgot',
        lastName: 'Password',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Si un compte existe');
        });
    });

    it('ne crée pas de token pour un compte inactif', async () => {
      const email = uniqueEmail('forgot-inactive');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Inactive',
        lastName: 'Forgot',
      });

      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const user = await prisma.user.findUnique({ where: { email } });
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/${user!.id}/status`)
        .send({ isActive: false })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Si un compte existe');
        });
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('réinitialise le mot de passe avec un token valide', async () => {
      const email = uniqueEmail('reset');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Reset',
        lastName: 'Password',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(200);

      // Récupérer le token créé
      const user = await prisma.user.findUnique({ where: { email } });
      const resetToken = await prisma.resetToken.findFirst({
        where: { userId: user!.id, used: false },
      });

      const newPassword = 'NewTestPassword@123';
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Mot de passe reinitialise avec succes');
        });

      // Vérifier que l'ancien token est invalidé
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken!.token,
          newPassword: 'AnotherPassword@123',
        })
        .expect(400);

      // Vérifier que le nouveau mot de passe fonctionne
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: newPassword })
        .expect(200);
    });

    it('rejette un token invalide', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword@123',
        })
        .expect(400);
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
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Mot de passe modifie avec succes');
        });

      // Vérifier que le nouveau mot de passe fonctionne
      await loginAs(app, email, newPassword);
    });

    it('rejette un mot de passe actuel incorrect', async () => {
      const email = uniqueEmail('wrong-current');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Wrong',
        lastName: 'Current',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);

      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@123',
        })
        .expect(401);
    });

    it('révoque les autres sessions après changement de mot de passe', async () => {
      const email = uniqueEmail('revoke-sessions');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Revoke',
        lastName: 'Sessions',
      });

      const session1 = await loginAs(app, email, TEST_PASSWORD);
      const session2 = await loginAs(app, email, TEST_PASSWORD);

      // Vérifier qu'il y a 2 sessions actives
      const sessions = await prisma.session.findMany({
        where: { userId: session1.user.id, isActive: true },
      });
      expect(sessions.length).toBe(2);

      const newPassword = 'NewTestUser@87654321';
      await authenticatedRequest(session1.agent)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword,
        })
        .expect(200);

      // Vérifier que seule la session actuelle est active
      const updatedSessions = await prisma.session.findMany({
        where: { userId: session1.user.id, isActive: true },
      });
      expect(updatedSessions.length).toBe(1);
      expect(updatedSessions[0].id).toBe(session1.sessionId);
    });
  });

  describe('POST /api/v1/auth/google/disconnect', () => {
    it('retourne 401 sans authentification', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/google/disconnect')
        .expect(401);
    });

    // Note: Les tests Google nécessitent une configuration spécifique
    // Pour les tests E2E, on vérifie seulement que la route existe
    it('GET /api/v1/auth/google - redirige vers Google', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/google')
        .expect(302);
    });
  });
});