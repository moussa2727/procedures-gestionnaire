// test/e2e/sessions.e2e-spec.ts
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

describe('Session Management (e2e)', () => {
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

  it('bloque la 3ème session simultanée', async () => {
    const email = uniqueEmail('session-limit');
    await registerStudent(app, {
      email,
      password: TEST_PASSWORD,
      firstName: 'Session',
      lastName: 'Test',
    });

    await loginAs(app, email, TEST_PASSWORD);
    await loginAs(app, email, TEST_PASSWORD);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toContain('Nombre maximum de sessions actives atteint');
      });
  });

  it('GET /api/v1/users/me/sessions - liste des sessions', async () => {
    const session = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
    await authenticatedRequest(session.agent)
      .get('/api/v1/users/me/sessions')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('deviceInfo');
          expect(res.body[0]).toHaveProperty('isCurrent');
        }
      });
  });
});