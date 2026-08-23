// test/e2e/zz-probe.e2e-spec.ts  (TEMPORARY DIAGNOSTIC — delete after use)
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { loginAs, setTestApp, uniqueEmail } from '../helpers/auth.helper';

jest.setTimeout(60000);

describe('PROBE', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
    await resetTestData(prisma, redisService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('P1: POST sans csrf ni x-public', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nope@e2e.local', password: 'wrong' });
    console.log('P1 status =', r.status, 'body =', JSON.stringify(r.body));
  });

  it('P2: login admin via helper', async () => {
    const admin = await loginAs(
      app,
      process.env.ADMIN_EMAIL!,
      process.env.ADMIN_PASSWORD!,
    );
    console.log('P2 admin cookies =', admin.cookies);
    console.log('P2 admin user =', JSON.stringify(admin.user));
  });

  it('P3: csrf-token endpoint', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/csrf-token');
    console.log('P3 status =', r.status, 'body =', JSON.stringify(r.body));
    console.log('P3 set-cookie =', JSON.stringify(r.headers['set-cookie']));
  });

  it('P4: agent GET /users/me (cookie jar intact)', async () => {
    const admin = await loginAs(
      app,
      process.env.ADMIN_EMAIL!,
      process.env.ADMIN_PASSWORD!,
    );
    const r = await admin.agent.get('/api/v1/users/me');
    console.log('P4 status =', r.status);
  });

  it('P5: POST /users with .set(Cookie, csrfCookies) — overwrite hypothesis', async () => {
    const admin = await loginAs(
      app,
      process.env.ADMIN_EMAIL!,
      process.env.ADMIN_PASSWORD!,
    );

    const csrfRes = await request(app.getHttpServer()).get('/api/v1/csrf-token');
    const csrfToken = csrfRes.body.csrfToken;
    const csrfCookies = csrfRes.headers['set-cookie'] as unknown as string[];

    const r = await admin.agent
      .post('/api/v1/users')
      .set('x-csrf-token', csrfToken)
      .set('Cookie', csrfCookies)
      .send({
        email: uniqueEmail('probe'),
        password: 'TestUser@12345678',
        firstName: 'C',
        lastName: 'T',
        role: 'CONSULTANT',
        isActive: true,
      });
    console.log('P5 status =', r.status, 'body =', JSON.stringify(r.body));
  });

  it('P6: POST /users with merged cookies (auth + csrf)', async () => {
    const admin = await loginAs(
      app,
      process.env.ADMIN_EMAIL!,
      process.env.ADMIN_PASSWORD!,
    );

    const csrfRes = await request(app.getHttpServer()).get('/api/v1/csrf-token');
    const csrfToken = csrfRes.body.csrfToken;
    const csrfCookie = (csrfRes.headers['set-cookie'] as unknown as string[])
      .map((c) => c.split(';')[0])
      .join('; ');

    const r = await admin.agent
      .post('/api/v1/users')
      .set('x-csrf-token', csrfToken)
      .set('Cookie', [...admin.cookies, csrfCookie].join('; '))
      .send({
        email: uniqueEmail('probe6'),
        password: 'TestUser@12345678',
        firstName: 'C',
        lastName: 'T',
        role: 'CONSULTANT',
        isActive: true,
      });
    console.log('P6 status =', r.status, 'body =', JSON.stringify(r.body));
  });
});
