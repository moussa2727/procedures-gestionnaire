import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';

describe('Debug Agent Login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    const prisma = app.get(require('@/prisma/prisma.service').PrismaService);
    const redis = app.get(require('@/redis/redis.service').RedisService);
    await resetTestData(prisma, redis);
  });

  afterAll(async () => {
    await app.close();
  });

  it('login with agent', async () => {
    const adminEmail = process.env.ADMIN_EMAIL!;
    const adminPassword = process.env.ADMIN_PASSWORD!;

    const agent = request.agent(app.getHttpServer());

    const response = await agent
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    console.log('LOGIN STATUS:', response.status);
    console.log('LOGIN BODY:', JSON.stringify(response.body, null, 2));

    expect(response.status).toBe(200);
  });
});
