// test/e2e/rendezvous-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createStudentSession,
  createRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
  Opinion,
} from '../helpers/fixtures.helper';
import { RendezvousStatus } from '@prisma/client';

const MALI_HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-01-20',
  '2026-05-01',
  '2026-12-25',
  '2026-08-15',
  '2026-11-01',
]);

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

describe('RendezVousController (e2e) — complémentaire', () => {
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

  async function setupRendezVous() {
    const { admin, consultant, consultantId } = await setupStandardUsers(app);
    const { destinationId } = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );
    const student = await createStudentSession(app);
    const rdv = await createRendezVous(app, student.agent, {
      consultantId,
      destinationId,
      date: getNextWorkableDate(5),
      time: TimeSlot.SLOT_1000,
    });
    return { admin, consultant, student, consultantId, destinationId, rdv };
  }

  describe('Replanification', () => {
    it('rejette le repliage vers une date passée', async () => {
      const { student, rdv } = await setupRendezVous();
      const pastDate = getPastWorkableDate();

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: pastDate, time: TimeSlot.SLOT_1000 })
        .expect(400);
    });
  });

  describe('Annulation', () => {
    it('par l\'étudiant', async () => {
      const { student, rdv } = await setupRendezVous();

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Je ne suis plus disponible.' })
        .expect(200);

      expect(response.body.status).toBe(RendezvousStatus.CANCELLED);
    });

    it('par le consultant', async () => {
      const { consultant, rdv } = await setupRendezVous();

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Impossible de ce faire ce créneau.' })
        .expect(200);

      expect(response.body.status).toBe(RendezvousStatus.CANCELLED);
    });

    it('par l\'administrateur', async () => {
      const { admin, rdv } = await setupRendezVous();

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulation administrative.' })
        .expect(200);

      expect(response.body.status).toBe(RendezvousStatus.CANCELLED);
    });
  });

  describe('Avis consultant', () => {
    it('le consultant peut donner un avis', async () => {
      const { consultant, rdv } = await setupRendezVous();

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(200);

      expect(response.body.opinion).toBe(Opinion.FAVORABLE);
    });

    it('l\'étudiant ne peut pas donner un avis consultant', async () => {
      const { student, rdv } = await setupRendezVous();

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(403);
    });

    it('ne peut pas donner un avis sur un rendez-vous annulé', async () => {
      const { consultant, rdv } = await setupRendezVous();

      await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulation' })
        .expect(200);

      await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(400);
    });
  });

  describe('Disponibilité du créneau', () => {
    it('le créneau devient indisponible après réservation', async () => {
      const { consultantId, destinationId, student } = await setupRendezVous();
      const workDate = getNextWorkableDate(5);
      const bookedTime = TimeSlot.SLOT_1000;

      const rdv = await createRendezVous(app, student.agent, {
        consultantId: consultantId,
        destinationId: destinationId,
        date: workDate,
        time: bookedTime,
      });

      const slots = await authenticatedRequest(student.agent)
        .get('/api/v1/availability/slots')
        .query({
          consultantId,
          destinationId,
          date: workDate,
          time: bookedTime,
        })
        .expect(200);

      expect(Array.isArray(slots.body)).toBe(true);
      expect(slots.body).not.toContain(bookedTime);
      expect(rdv.body.status).toBe(RendezvousStatus.CONFIRMED);
    });
  });

  describe('Multiples rendez-vous pour un même étudiant', () => {
    it('un étudiant peut prendre plusieurs rendez-vous', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(8),
        time: TimeSlot.SLOT_1400,
      });

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/rendez-vous/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });
});
