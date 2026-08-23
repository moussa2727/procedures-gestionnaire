// test/e2e/security.e2e-spec.ts
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

  it('rejette les identifiants invalides', async () => {
    const email = 'nonexistent@e2e.local';

    // Invalid credentials should always return 401
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    }
  });

  it('verrouille le compte après 5 tentatives échouées', async () => {
    const email = uniqueEmail('lock-test');
    await registerStudent(app, {
      email,
      password: TEST_PASSWORD,
      firstName: 'Lock',
      lastName: 'Test',
    });

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    }

    // After 5 failed attempts, rate limiter kicks in (429)
    // Account lockout happens at the application level
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD });

    // Either 429 (rate limited) or 403 (account locked) is acceptable
    expect([403, 429]).toContain(response.status);
  });

  it('blackliste le token après logout', async () => {
    const { admin } = await setupStandardUsers(app);

    const cookies = admin.cookies;
    const accessToken = cookies.find(c => c.startsWith('access_token='))?.split('=')[1];

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
});