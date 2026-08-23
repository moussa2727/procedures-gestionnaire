// test/e2e/follow-up-meeting.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createDestinationWithConsultant,
  createRendezVous,
  createProcedureFromRendezVous,
  createFollowUpMeeting,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
} from '../helpers/fixtures.helper';

describe('FollowUpMeetingController (e2e)', () => {
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

  describe('POST /api/v1/follow-up-meeting — créer un rendez-vous de suivi', () => {
    it('etudiant peut créer un rendez-vous de suivi pour sa procédure', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
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
      const procedure = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv.id,
      );

      const response = await authenticatedRequest(student.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
          reason: 'Suivi dossier',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.procedureId).toBe(procedure.id);
    });
  });

  describe('GET /api/v1/follow-up-meeting/procedure/:procedureId — lister les suivis', () => {
    it('admin peut lister les suivis d\'une procédure', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
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
      const procedure = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv.id,
      );
      await createFollowUpMeeting(app, admin.agent, procedure.id);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/follow-up-meeting/procedure/${procedure.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/follow-up-meeting/:id — détail rendez-vous de suivi', () => {
    it('etudiant peut voir un rendez-vous de suivi', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
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
      const procedure = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv.id,
      );
      const meeting = await createFollowUpMeeting(
        app,
        student.agent,
        procedure.id,
      );

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/follow-up-meeting/${meeting.id}`)
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
    });
  });

  describe('PATCH /api/v1/follow-up-meeting/:id/reschedule — replanifier', () => {
    it('etudiant peut replanifier un rendez-vous de suivi', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
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
      const procedure = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv.id,
      );
      const meeting = await createFollowUpMeeting(
        app,
        student.agent,
        procedure.id,
      );

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: getNextWorkableDate(15), time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(getNextWorkableDate(15));
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);
    });
  });

  describe('PATCH /api/v1/follow-up-meeting/:id/complete — marquer terminé', () => {
    it('consultant peut marquer un rendez-vous de suivi comme terminé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
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
      const procedure = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv.id,
      );
      const meeting = await createFollowUpMeeting(
        app,
        (await createConsultantViaAdmin(app, admin.agent)).agent,
        procedure.id,
      );

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });
  });
});