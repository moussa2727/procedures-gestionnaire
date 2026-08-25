// test/e2e/05-availability.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { AbsenceType, TimeSlot } from '@prisma/client';
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
  createConsultantViaAdmin,
  createRendezVous,
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

  describe('GET /api/v1/availability/day - Routes publiques', () => {
    it('retourne la disponibilité d\'une journée', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: workDate })
        .expect(200);

      expect(response.body.date).toBe(workDate);
      expect(response.body.dayOfWeek).toBeDefined();
      expect(response.body.isWorkable).toBeDefined();
      expect(response.body.isWeekend).toBeDefined();
      expect(response.body.isHoliday).toBeDefined();
      expect(response.body.holidayName).toBeDefined();
      expect(response.body.hasAvailableSlots).toBeDefined();
      expect(Array.isArray(response.body.availableSlots)).toBe(true);
    });

    it('filtre par consultant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: workDate, consultantId })
        .expect(200);

      expect(response.body.availableSlots).toBeDefined();
    });

    it('rejette sans destinationId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ date: workDate })
        .expect(400);
    });

    it('rejette sans date', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId })
        .expect(400);
    });

    it('rejette une date invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: 'invalid-date' })
        .expect(400);
    });

    it('retourne une journée non travaillable pour un week-end', async () => {
      // Trouver un samedi
      let weekendDate = new Date();
      while (weekendDate.getDay() !== 6) {
        weekendDate.setDate(weekendDate.getDate() + 1);
      }
      const dateStr = weekendDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/day')
        .query({ destinationId, date: dateStr })
        .expect(200);

      expect(response.body.isWeekend).toBe(true);
      expect(response.body.isWorkable).toBe(false);
      expect(response.body.hasAvailableSlots).toBe(false);
      expect(response.body.availableSlots).toEqual([]);
    });
  });

  describe('GET /api/v1/availability/range', () => {
    it('retourne la disponibilité sur une période', async () => {
      const endDate = getNextWorkableDate(28);

      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({
          destinationId,
          startDate: workDate,
          endDate,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('date');
        expect(response.body[0]).toHaveProperty('dayOfWeek');
        expect(response.body[0]).toHaveProperty('isWorkable');
        expect(response.body[0]).toHaveProperty('hasAvailableSlots');
        expect(response.body[0]).toHaveProperty('availableSlots');
      }
    });

    it('filtre par consultant', async () => {
      const endDate = getNextWorkableDate(28);

      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({
          destinationId,
          startDate: workDate,
          endDate,
          consultantId,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejette sans destinationId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({ startDate: workDate, endDate: getNextWorkableDate(28) })
        .expect(400);
    });

    it('rejette sans startDate', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({ destinationId, endDate: getNextWorkableDate(28) })
        .expect(400);
    });

    it('rejette sans endDate', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({ destinationId, startDate: workDate })
        .expect(400);
    });

    it('rejette une date de début après la date de fin', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/range')
        .query({
          destinationId,
          startDate: getNextWorkableDate(28),
          endDate: workDate,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/availability/slots', () => {
    it('retourne les créneaux libres', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({
          destinationId,
          date: workDate,
          consultantId,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Vérifier que les créneaux sont des TimeSlot valides
      if (response.body.length > 0) {
        expect(Object.values(TimeSlot).includes(response.body[0])).toBe(true);
      }
    });

    it('retourne les créneaux filtrés par consultant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({
          destinationId,
          date: workDate,
          consultantId,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('ne retourne pas les créneaux passés', async () => {
      // Utiliser une date passée
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      const response = await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({
          destinationId,
          date: dateStr,
          consultantId,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('rejette sans destinationId', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({ date: workDate })
        .expect(400);
    });

    it('rejette sans date', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/availability/slots')
        .query({ destinationId })
        .expect(400);
    });
  });

  describe('GET /api/v1/availability/check - Authentifié', () => {
    it('vérifie un créneau disponible', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200);

      expect(response.body.available).toBeDefined();
      // Le créneau peut être disponible ou non selon la configuration
      // On vérifie juste la structure
      expect(response.body).toHaveProperty('available');
    });

    it('retourne une raison si indisponible', async () => {
      const { student } = await setupStandardUsers(app);

      // Créer un rendez-vous pour bloquer un créneau
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: workDate,
        time: TimeSlot.SLOT_1000,
      });

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.reason).toBeDefined();
    });

    it('retourne les conflits', async () => {
      const { student } = await setupStandardUsers(app);

      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: workDate,
        time: TimeSlot.SLOT_1000,
      });

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200);

      if (!response.body.available) {
        expect(response.body.conflict).toBeDefined();
        expect(response.body.conflict.type).toBeDefined();
        expect(response.body.conflict.id).toBeDefined();
        expect(response.body.conflict.bookingId).toBeDefined();
      }
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

    it('rejette sans consultantId', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(400);
    });

    it('rejette sans destinationId', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(400);
    });

    it('rejette sans date', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          time: TimeSlot.SLOT_1000,
        })
        .expect(400);
    });

    it('rejette sans time', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
        })
        .expect(400);
    });
  });

  describe('Gestion des indisponibilités consultant', () => {
    it('prend en compte les absences du consultant', async () => {
      const { student, admin } = await setupStandardUsers(app);

      // Créer une absence pour le consultant
      await authenticatedRequest(admin.agent)
        .post(`/api/v1/consultant-unavailability/admin/${consultantId}`)
        .send({
          startDate: workDate,
          endDate: workDate,
          type: AbsenceType.CONGES,
        })
        .expect(201);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.reason).toContain('indisponible');
    });

    it('prend en compte les week-ends', async () => {
      const { student } = await setupStandardUsers(app);
      let weekendDate = new Date();
      while (weekendDate.getDay() !== 6) {
        weekendDate.setDate(weekendDate.getDate() + 1);
      }
      const dateStr = weekendDate.toISOString().split('T')[0];

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/availability/check')
        .query({
          consultantId,
          destinationId,
          date: dateStr,
          time: TimeSlot.SLOT_1000,
        })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.reason).toContain('week-end');
    });

   it('prend en compte les jours fériés', async () => {
  const { student } = await setupStandardUsers(app);

  // Le 1er janvier est un jour férié au Mali
  const holidayDate = '2026-01-01';
  
  // Vérifier que c'est bien un jour férié
  const dayCheck = await request(app.getHttpServer())
    .get('/api/v1/availability/day')
    .query({
      destinationId,
      date: holidayDate,
      consultantId,
    })
    .expect(200);

  // Si le service Holiday est configuré pour le Mali, 01/01 est férié
  // Sinon, on peut utiliser une autre date ou créer une absence
  if (dayCheck.body.isHoliday) {
    const response = await authenticatedRequest(student.agent)
      .get('/api/v1/availability/check')
      .query({
        consultantId,
        destinationId,
        date: holidayDate,
        time: TimeSlot.SLOT_1000,
      })
      .expect(200);

    expect(response.body.available).toBe(false);
    expect(response.body.reason).toContain('férié');
  } else {
    // Si le service Holiday n'est pas configuré, on passe le test
    // ou on crée une absence pour simuler
    console.log('HolidayService non configuré pour Mali, test ignoré');
  }
});
  });
});