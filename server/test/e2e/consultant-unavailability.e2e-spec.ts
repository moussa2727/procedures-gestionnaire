// test/e2e/consultant-unavailability.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  loginAs,
  setTestApp,
} from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  setupStandardUsers,
} from '../helpers/fixtures.helper';
import { AbsenceType } from '@prisma/client';

describe('ConsultantUnavailabilityController (e2e)', () => {
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

  describe('POST /api/v1/consultant-unavailability/mine', () => {
    it('consultant peut déclarer une absence pour lui-même', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.consultantId).toBe(consultant.user.id);
      expect(response.body.type).toBe(AbsenceType.CONGES);
    });

    it('rejette un étudiant', async () => {
      const student = await createStudentSession(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(403);
    });

    it('rejette une date de début après la date de fin', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-10',
          endDate: '2026-09-01',
          type: AbsenceType.CONGES,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/consultant-unavailability/mine', () => {
    it('consultant voit ses propres absences', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(201);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/consultant-unavailability/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });
  });

  describe('POST /api/v1/consultant-unavailability/admin/:consultantId', () => {
    it('admin peut déclarer une absence pour un consultant', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      const response = await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.FORMATION,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.consultantId).toBe(consultantId);
    });
  });

  describe('GET /api/v1/consultant-unavailability/range', () => {
    it('retourne les absences sur une période', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/consultant-unavailability/range')
        .query({
          consultantId,
          start: '2026-09-01',
          end: '2026-09-05',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });
  });

  describe('DELETE /api/v1/consultant-unavailability/:id', () => {
    it('consultant peut supprimer sa propre absence', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const createResponse = await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(201);

      await authenticatedRequest(consultant.agent)
        .delete(`/api/v1/consultant-unavailability/${createResponse.body.id}`)
        .expect(200);
    });

    it('admin peut supprimer une absence', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      const createResponse = await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.MALADIE,
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/consultant-unavailability/${createResponse.body.id}`)
        .expect(200);
    });
  });
});