// test/e2e/followup-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createStudentSession,
  createRendezVous,
  createProcedureFromRendezVous,
  createFollowUpMeeting,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
} from '../helpers/fixtures.helper';

describe('FollowUpMeetingController (e2e) — complémentaire', () => {
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

  async function setupProcedure() {
    const { admin, consultant, consultantId, student } =
      await setupStandardUsers(app);
    const { destinationId } = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );
    const rdv = await createRendezVous(app, student.agent, {
      consultantId,
      destinationId,
      date: getNextWorkableDate(5),
      time: TimeSlot.SLOT_1000,
    });
    const procedure = await createProcedureFromRendezVous(
      app,
      admin.agent,
      rdv.id,
    );
    return { admin, consultant, student, consultantId, destinationId, rdv, procedure };
  }

  describe('Création', () => {
    it('POST /follow-up-meeting — crée un rendez-vous de suivi', async () => {
      const { student, procedure } = await setupProcedure();

      const meeting = await createFollowUpMeeting(app, student.agent, procedure.id);

      expect(meeting.id).toBeDefined();
      expect(meeting.body.procedureId).toBe(procedure.id);
      expect(meeting.body.status).toBe(MeetingStatus.CONFIRMED);
    });
  });

  describe('Replanification', () => {
    it('PATCH /follow-up-meeting/:id/reschedule — replanifie', async () => {
      const { student, procedure } = await setupProcedure();
      const meeting = await createFollowUpMeeting(app, student.agent, procedure.id);
      const newDate = getNextWorkableDate(15);

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: newDate, time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(newDate);
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);
    });
  });

  describe('Annulation', () => {
    it('PATCH /follow-up-meeting/:id/cancel — annule par l\'étudiant', async () => {
      const { student, procedure } = await setupProcedure();
      const meeting = await createFollowUpMeeting(app, student.agent, procedure.id);

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Je ne suis plus disponible.' })
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.CANCELLED);
    });
  });

  describe('Clôture', () => {
    it('PATCH /follow-up-meeting/:id/complete — clôt par le consultant', async () => {
      const { consultant, student, procedure } = await setupProcedure();
      const meeting = await createFollowUpMeeting(app, student.agent, procedure.id);

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe(MeetingStatus.COMPLETED);
    });

    it('l\'étudiant ne peut pas clôturer un rendez-vous de suivi', async () => {
      const { student, procedure } = await setupProcedure();
      const meeting = await createFollowUpMeeting(app, student.agent, procedure.id);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(403);
    });
  });

  describe('Dépendance au statut de la procédure', () => {
    it('exige qu\'une procédure IN_PROGRESS est associée', async () => {
      const { admin, student, procedure } = await setupProcedure();

      // On rejette la procédure: elle n'est plus IN_PROGRESS.
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet.' })
        .expect(200);

      await authenticatedRequest(student.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
          reason: 'Suivi impossible.',
        })
        .expect(400);
    });
  });

  describe('Listes', () => {
    it('GET /follow-up-meeting/mine — liste les suivis de l\'étudiant', async () => {
      const { student, procedure } = await setupProcedure();
      await createFollowUpMeeting(app, student.agent, procedure.id);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/follow-up-meeting/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('GET /follow-up-meeting/consultant/mine — liste les suivis du consultant', async () => {
      const { consultant, student, procedure } = await setupProcedure();
      await createFollowUpMeeting(app, student.agent, procedure.id);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/follow-up-meeting/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
