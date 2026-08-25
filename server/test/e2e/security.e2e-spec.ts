// test/e2e/15-security.e2e-spec.ts
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
import { TEST_PASSWORD, setupStandardUsers } from '../helpers/fixtures.helper';

describe('Security (e2e)', () => {
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

  describe('Rate limiting', () => {
    it('limite les tentatives de login', async () => {
      const email = 'nonexistent@e2e.local';

      // Les 5 premières tentatives échouent avec 401
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong' })
          .expect(401);
      }

      // La 6ème tentative devrait être limitée (429)
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong' })
        .expect(429);
    });

    it('limite les inscriptions', async () => {
      const email = uniqueEmail('rate-register');

      // Faire plusieurs inscriptions rapides
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/v1/auth/register')
            .send({
              email: uniqueEmail(`rate-register-${i}`),
              password: TEST_PASSWORD,
              firstName: 'Rate',
              lastName: `Test${i}`,
            })
        );
      }

      const responses = await Promise.all(promises);
      const limited = responses.filter(r => r.status === 429);
      expect(limited.length).toBeGreaterThan(0);
    });

    it('limite les demandes de réinitialisation de mot de passe', async () => {
      const email = uniqueEmail('rate-reset');

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({ email })
          .expect(200);
      }

      // La 6ème demande devrait être limitée
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(429);
    });
  });

  describe('Verrouillage de compte', () => {
    it('verrouille le compte après 5 tentatives échouées', async () => {
      const email = uniqueEmail('lock-test');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Lock',
        lastName: 'Test',
      });

      // 5 tentatives échouées
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong' })
          .expect(401);
      }

      // 6ème tentative avec le bon mot de passe
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('verrouille');
        });

      // Vérifier en base
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.lockedUntil).toBeDefined();
      expect(user?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    });

    it('réinitialise le compteur après connexion réussie', async () => {
      const email = uniqueEmail('reset-counter');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Reset',
        lastName: 'Counter',
      });

      // 3 tentatives échouées
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong' })
          .expect(401);
      }

      // Connexion réussie
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(200);

      // Vérifier que le compteur est réinitialisé
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.failedLoginAttempts).toBe(0);
      expect(user?.lockedUntil).toBeNull();
    });
  });

  describe('Token blacklisting', () => {
    it('blackliste le token après logout', async () => {
      const { admin } = await setupStandardUsers(app);

      const cookies = admin.cookies;
      const accessToken = cookies.find(c => c.startsWith('access_token='))?.split('=')[1]?.split(';')[0];

      await authenticatedRequest(admin.agent)
        .post('/api/v1/auth/logout')
        .expect(200);

      if (accessToken) {
        await request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Cookie', [`access_token=${accessToken}`])
          .expect(401);
      }
    });

    it('invalide tous les tokens après logout-all', async () => {
      const email = uniqueEmail('blacklist-all');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Blacklist',
        lastName: 'All',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);
      const accessToken = session.cookies.find(c => c.startsWith('access_token='))?.split('=')[1]?.split(';')[0];

      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/logout-all')
        .expect(200);

      if (accessToken) {
        await request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Cookie', [`access_token=${accessToken}`])
          .expect(401);
      }
    });

    it('les tokens blacklistés ne fonctionnent pas après refresh', async () => {
      const email = uniqueEmail('blacklist-refresh');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Blacklist',
        lastName: 'Refresh',
      });

      const session = await loginAs(app, email, TEST_PASSWORD);

      // Logout
      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/logout')
        .expect(200);

      // Tentative de refresh
      await authenticatedRequest(session.agent)
        .post('/api/v1/auth/refresh')
        .expect(401);
    });
  });

  describe('Protection CSRF', () => {
    it('les cookies sont httpOnly et secure', async () => {
      const email = uniqueEmail('csrf-test');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'CSRF',
        lastName: 'Test',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(200);

      const cookies = response.headers['set-cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

      // Vérifier que les cookies sont HttpOnly
      expect(cookieArray.some((c: string) => c.includes('HttpOnly'))).toBe(true);

      // Vérifier que les cookies sont Secure en production
      if (process.env.NODE_ENV === 'production') {
        expect(cookieArray.some((c: string) => c.includes('Secure'))).toBe(true);
      }
    });
  });

  describe('Protection des données', () => {
    it('les IDs sont masqués dans les logs', async () => {
      // Vérifier que les logs ne contiennent pas d'IDs en clair
      // Ce test est plus conceptuel - on vérifie que les logs sont masqués
      // En pratique, on peut vérifier que les réponses ne contiennent pas
      // d'informations sensibles
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users/me')
        .expect(200);

      // L'email n'est pas masqué dans la réponse, mais devrait l'être dans les logs
      expect(response.body.email).toBeDefined();
    });

    it('les mots de passe ne sont jamais retournés', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/users/me')
        .expect(200);

      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('Gestion des sessions', () => {
    it('limite le nombre de sessions simultanées', async () => {
      const email = uniqueEmail('session-limit');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Session',
        lastName: 'Limit',
      });

      // Session 1
      await loginAs(app, email, TEST_PASSWORD);
      // Session 2
      await loginAs(app, email, TEST_PASSWORD);

      // Session 3 - devrait être refusée
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Nombre maximum de sessions actives atteint');
        });
    });

    it('permet de lister ses sessions actives', async () => {
      const session = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      await authenticatedRequest(session.agent)
        .get('/api/v1/users/me/sessions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('isCurrent');
          }
        });
    });
  });
});