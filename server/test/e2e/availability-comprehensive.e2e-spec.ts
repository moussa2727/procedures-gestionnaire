// test/e2e/availability-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { TimeSlot } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  setTestApp,
  loginAs,
} from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
} from '../helpers/fixtures.helper';

const MALI_HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-01-20',
  '2026-05-01',
  '2026-12-25',
  '2026-08-15',
  '2026-11-01',
]);

function getNextWeekendDate(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  while (date.getDay() !== 0 && date.getDay() !== 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

function getPastWorkableDate(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - 2);
  while (
    date.getDay() === 0 ||
    date.getDay() === 6 ||
    MALI_HOLIDAYS_2026.has(date.toISOString().split('T')[0])
  ) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString().split('T')[0];
}

describe('AvailabilityController (e2e) — complémentaire', () => {
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

  describe('Jours fériés et week-ends', () => {
    it('GET /day — bloque les week-ends', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const weekendDate = getNextWeekendDate();

      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: weekendDate })
        .expect(200)
        .expect((res) => {
          expect(res.body.isWeekend).toBe(true);
          expect(res.body.isWorkable).toBe(false);
          expect(Array.isArray(res.body.availableSlots)).toBe(true);
          expect(res.body.availableSlots.length).toBe(0);
        });
    });

    it('GET /day — bloque les jours fériés', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const holidayDate = '2026-01-01';

      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: holidayDate })
        .expect(200)
        .expect((res) => {
          expect(res.body.isHoliday).toBe(true);
          expect(res.body.isWorkable).toBe(false);
          expect(res.body.holidayName).toBeTruthy();
          expect(res.body.availableSlots.length).toBe(0);
        });
    });
  });

  describe('Dates / créneaux dans le passé', () => {
    it('GET /availability/check — un créneau passé est indisponible', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const pastDate = getPastWorkableDate();

      await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: pastDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.available).toBe(false);
          expect(res.body.reason).toContain('passé');
        });
    });

    it('POST /rendez-vous — rejette un créneau dans le passé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const pastDate = getPastWorkableDate();

      await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: pastDate,
          time: TimeSlot.SLOT_1000,
          firstName: 'Etudiant',
          lastName: 'Test',
          email: 'past-slot@e2e.local',
          phone: '0600000000',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(400);
    });
  });

  describe('Disponibilité après réservation', () => {
    it('GET /availability/slots — le créneau est libéré après réservation', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const workDate = getNextWorkableDate(5);
      const bookedTime = TimeSlot.SLOT_1000;

      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: workDate,
        time: bookedTime,
      });

      await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({ destinationId, date: workDate, consultantId })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).not.toContain(bookedTime);
        });
    });
  });

  describe('Multiples consultants', () => {
    it('GET /day — plusieurs consultants activés rendent la journée disponible', async () => {
      const { admin, consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const secondConsultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId: secondConsultant.user.id })
        .expect(201);

      const workDate = getNextWorkableDate();

      const dayResponse = await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: workDate })
        .expect(200);

      expect(dayResponse.body.hasAvailableSlots).toBe(true);

      const [firstSlots, secondSlots] = await Promise.all([
        request(app.getHttpServer())
          .get('/api/v1/availability/slots')
          .query({
            destinationId,
            date: workDate,
            consultantId,
          })
          .expect(200),
        request(app.getHttpServer())
          .get('/api/v1/availability/slots')
          .query({
            destinationId,
            date: workDate,
            consultantId: secondConsultant.user.id,
          })
          .expect(200),
      ]);

      expect(firstSlots.body.length).toBeGreaterThan(0);
      expect(secondSlots.body.length).toBeGreaterThan(0);
    });
  });

  describe('Plage de dates', () => {
    it('GET /availability/range — ne retourne que les jours travaillables de la période', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const startDate = getNextWorkableDate();
      const endDate = getNextWorkableDate(14);

      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({ destinationId, startDate, endDate })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      for (const day of response.body) {
        expect(day.isWorkable).toBe(true);
        expect(day.hasAvailableSlots).toBe(true);
        expect(day.date >= startDate && day.date <= endDate).toBe(true);
      }
    });
  });

  describe('Validation des paramètres', () => {
    it('GET /availability/day — rejette un destinationId manquant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const workDate = getNextWorkableDate();

      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ date: workDate })
        .expect(400);
    });

    it('GET /availability/day — rejette un format de date invalide', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: 'not-a-real-date' })
        .expect(400);
    });
  });
});
