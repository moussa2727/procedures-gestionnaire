// test/e2e/availability.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { TimeSlot } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createDestinationWithConsultant,
  getNextWorkableDate,
  setupStandardUsers,
} from '../helpers/fixtures.helper';

describe('AvailabilityController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let destinationId: string;
  let consultantId: string;
  let workDate: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);
    const users = await setupStandardUsers(app);
    consultantId = users.consultantId;
    const destination = await createDestinationWithConsultant(
      app,
      users.admin.agent,
      consultantId,
    );
    destinationId = destination.destinationId;
    workDate = getNextWorkableDate();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Routes publiques', () => {
    it('GET /api/v1/availability/day — disponibilité journalière', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: workDate })
        .expect(200);
    });

    it('GET /api/v1/availability/day — rejette sans paramètres', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .expect(400);
    });

    it('GET /api/v1/availability/range — disponibilité sur période', async () => {
      const endDate = getNextWorkableDate(28);

      await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({
          destinationId,
          startDate: workDate,
          endDate,
        })
        .expect(200);
    });

    it('GET /api/v1/availability/slots — créneaux libres', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({
          destinationId,
          date: workDate,
          consultantId,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /api/v1/availability/check — authentifié', () => {
    it('vérifie un créneau avant réservation', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200);
    });

    it('retourne 401 sans authentification', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(401);
    });
  });
});