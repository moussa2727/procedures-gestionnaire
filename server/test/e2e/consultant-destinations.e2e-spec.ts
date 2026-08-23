// test/e2e/consultant-destinations.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createDestinationWithConsultant,
  setupStandardUsers,
} from '../helpers/fixtures.helper';

describe('ConsultantDestinationController (e2e)', () => {
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

  it('POST /api/v1/admin/consultant-destinations/:destinationId — affecte un consultant', async () => {
    const { admin, consultantId } = await setupStandardUsers(app);
    const { destinationId } = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );

    await authenticatedRequest(admin.agent)
      .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
      .send({ consultantId })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('GET /api/v1/admin/consultant-destinations/destination/:destinationId', async () => {
    const { admin, consultantId } = await setupStandardUsers(app);
    const { destinationId } = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );

    await authenticatedRequest(admin.agent)
      .get(`/api/v1/admin/consultant-destinations/destination/${destinationId}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /api/v1/admin/consultant-destinations/consultant/:consultantId', async () => {
    const { admin, consultantId } = await setupStandardUsers(app);
    await createDestinationWithConsultant(app, admin.agent, consultantId);

    await authenticatedRequest(admin.agent)
      .get(`/api/v1/admin/consultant-destinations/consultant/${consultantId}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('DELETE /api/v1/admin/consultant-destinations/:destinationId/:consultantId', async () => {
    const { admin, consultantId } = await setupStandardUsers(app);
    const { destinationId } = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );

    // Create a second consultant to assign to the destination
    const consultant2 = await createConsultantViaAdmin(app, admin.agent, 'second');

    // Assign the second consultant to the destination
    await authenticatedRequest(admin.agent)
      .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
      .send({ consultantId: consultant2.user.id })
      .expect(201);

    // Now we can remove one consultant (there are 2)
    const deleteResponse = await authenticatedRequest(admin.agent)
      .delete(
        `/api/v1/admin/consultant-destinations/${destinationId}/${consultantId}`,
      );

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);
  });

  it('refuse l\'accès aux non-admins', async () => {
    const { student } = await setupStandardUsers(app);

    await authenticatedRequest(student.agent)
      .get('/api/v1/admin/consultant-destinations/consultant/fake-id')
      .expect(403);
  });
});