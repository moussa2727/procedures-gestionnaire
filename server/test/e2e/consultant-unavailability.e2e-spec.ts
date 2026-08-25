// test/e2e/06-consultant-unavailability.e2e-spec.ts
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
    it('consultant déclare une absence pour lui-même', async () => {
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
      expect(response.body.startDate).toBe('2026-09-01');
      expect(response.body.endDate).toBe('2026-09-05');
    });

    it('déclare tous les types d\'absence', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const types = [
        AbsenceType.CONGES,
        AbsenceType.MALADIE,
        AbsenceType.FORMATION,
        AbsenceType.MISSION,
        AbsenceType.DEPLACEMENT,
        AbsenceType.ABSENCE_AUTORISEE,
        AbsenceType.EVENEMENT_FAMILIAL,
        AbsenceType.AUTRE,
      ];

      for (const type of types) {
        const response = await authenticatedRequest(consultant.agent)
          .post('/api/v1/consultant-unavailability/mine')
          .send({
            startDate: '2026-09-01',
            endDate: '2026-09-01',
            type,
          })
          .expect(201);

        expect(response.body.type).toBe(type);
      }
    });

    it('déclare une absence avec une raison', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
          reason: 'Congés annuels',
        })
        .expect(201);

      expect(response.body.reason).toBe('Congés annuels');
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

    it('rejette un chevauchement de dates', async () => {
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

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-03',
          endDate: '2026-09-07',
          type: AbsenceType.MALADIE,
        })
        .expect(400);
    });

    it('accepte un chevauchement de dates exact', async () => {
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

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-06',
          endDate: '2026-09-10',
          type: AbsenceType.MALADIE,
        })
        .expect(201);
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

    it('rejette un admin', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(403);
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
      expect(response.body[0].consultantId).toBe(consultant.user.id);
      expect(response.body[0].type).toBe(AbsenceType.CONGES);
    });

    it('consultant voit toutes ses absences', async () => {
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

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          type: AbsenceType.MALADIE,
        })
        .expect(201);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/consultant-unavailability/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('rejette un étudiant', async () => {
      const student = await createStudentSession(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/consultant-unavailability/mine')
        .expect(403);
    });
  });

  describe('POST /api/v1/consultant-unavailability/admin/:consultantId', () => {
    it('admin déclare une absence pour un consultant', async () => {
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
      expect(response.body.type).toBe(AbsenceType.FORMATION);
    });

    it('admin déclare une absence avec raison', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      const response = await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.FORMATION,
          reason: 'Formation obligatoire',
        })
        .expect(201);

      expect(response.body.reason).toBe('Formation obligatoire');
    });

    it('rejette un consultant inexistant', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/consultant-unavailability/admin/00000000-0000-0000-0000-000000000000')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.FORMATION,
        })
        .expect(404);
    });

    it('rejette un étudiant', async () => {
      const student = await createStudentSession(app);
      const { consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.FORMATION,
        })
        .expect(403);
    });

    it('rejette un consultant', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);
      const otherConsultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/consultant-unavailability/admin/${otherConsultant.user.id}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.FORMATION,
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/consultant-unavailability/admin/:consultantId', () => {
    it('admin liste les absences d\'un consultant', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('rejette un étudiant', async () => {
      const student = await createStudentSession(app);
      const { consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .expect(403);
    });

    it('rejette un consultant', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultant = await createConsultantViaAdmin(app, admin.agent);
      const { consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .expect(403);
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
      expect(response.body[0].consultantId).toBe(consultantId);
    });

    it('retourne les absences partielles sur une période', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-10',
          type: AbsenceType.CONGES,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/consultant-unavailability/range')
        .query({
          consultantId,
          start: '2026-09-05',
          end: '2026-09-15',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('retourne une liste vide pour une période sans absences', async () => {
      const { consultantId } = await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .get('/api/v1/consultant-unavailability/range')
        .query({
          consultantId,
          start: '2026-09-01',
          end: '2026-09-05',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('rejette sans consultantId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/consultant-unavailability/range')
        .query({ start: '2026-09-01', end: '2026-09-05' })
        .expect(400);
    });

    it('rejette sans start', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/consultant-unavailability/range')
        .query({ consultantId: 'id', end: '2026-09-05' })
        .expect(400);
    });

    it('rejette sans end', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/consultant-unavailability/range')
        .query({ consultantId: 'id', start: '2026-09-01' })
        .expect(400);
    });

    it('est accessible à un étudiant', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/consultant-unavailability/range')
        .query({
          consultantId,
          start: '2026-09-01',
          end: '2026-09-05',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('DELETE /api/v1/consultant-unavailability/:id', () => {
    it('consultant supprime sa propre absence', async () => {
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
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const absence = await prisma.consultantUnavailability.findUnique({
        where: { id: createResponse.body.id },
      });
      expect(absence).toBeNull();
    });

    it('admin supprime une absence', async () => {
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

    it('rejette une absence inexistante', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

      await authenticatedRequest(admin.agent)
        .delete('/api/v1/consultant-unavailability/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('rejette un étudiant', async () => {
      const student = await createStudentSession(app);
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

      await authenticatedRequest(student.agent)
        .delete(`/api/v1/consultant-unavailability/${createResponse.body.id}`)
        .expect(403);
    });

    it('consultant ne supprime pas l\'absence d\'un autre consultant', async () => {
      const admin = await loginAs(app, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
      const consultantA = await createConsultantViaAdmin(app, admin.agent);
      const consultantB = await createConsultantViaAdmin(app, admin.agent);

      const createResponse = await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantB.user.id}`)
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: AbsenceType.CONGES,
        })
        .expect(201);

      await authenticatedRequest(consultantA.agent)
        .delete(`/api/v1/consultant-unavailability/${createResponse.body.id}`)
        .expect(403);
    });
  });
});