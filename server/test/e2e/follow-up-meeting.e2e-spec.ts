// test/e2e/09-follow-up-meeting.e2e-spec.ts
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
      expect(response.body.studentId).toBe(student.user.id);
      expect(response.body.consultantId).toBe(consultantId);
      expect(response.body.status).toBe('CONFIRMED');
      expect(response.body.createdBy).toBe('ETUDIANT');
      expect(response.body.reason).toBe('Suivi dossier');

      // Vérifier en base
      const meeting = await prisma.followUpMeeting.findUnique({
        where: { id: response.body.id },
      });
      expect(meeting).toBeDefined();
      expect(meeting?.status).toBe('CONFIRMED');
      
      // Vérifier le booking
      const booking = await prisma.consultantBooking.findUnique({
        where: {
          consultantId_date_time: {
            consultantId,
            date: new Date(getNextWorkableDate(10)),
            time: TimeSlot.SLOT_1000,
          },
        },
      });
      expect(booking).toBeDefined();
      expect(booking?.followUpMeetingId).toBe(response.body.id);
    });

    it('consultant peut créer un rendez-vous de suivi', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
          reason: 'Suivi par consultant',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.createdBy).toBe('CONSULTANT');
    });

    it('admin ne peut pas créer un rendez-vous de suivi', async () => {
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

      await authenticatedRequest(admin.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
        })
        .expect(403);
    });

    it('rejette une procédure inexistante', async () => {
      const student = await createStudentSession(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: '00000000-0000-0000-0000-000000000000',
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
        })
        .expect(404);
    });

    it('rejette une procédure non en cours', async () => {
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
      
      // Compléter la procédure
      const steps = await prisma.step.findMany({
        where: { procedureId: procedure.id },
      });
      for (const step of steps) {
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/procedure/${procedure.id}/steps/${step.id}`)
          .send({ status: 'COMPLETED' })
          .expect(200);
      }
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      await authenticatedRequest(student.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
        })
        .expect(400);
    });

    it('rejette un créneau déjà pris', async () => {
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

      // Premier rendez-vous de suivi
      await authenticatedRequest(student.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
        })
        .expect(201);

      // Deuxième rendez-vous de suivi - même créneau
      const student2 = await createStudentSession(app, 'second');
      const rdv2 = await createRendezVous(app, student2.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const procedure2 = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv2.id,
      );

      await authenticatedRequest(student2.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure2.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/follow-up-meeting/procedure/:procedureId', () => {
    it('admin liste les suivis d\'une procédure', async () => {
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
      
      await createFollowUpMeeting(app, student.agent, procedure.id);
      await createFollowUpMeeting(app, student.agent, procedure.id, {
        date: getNextWorkableDate(15),
        time: TimeSlot.SLOT_1400,
      });

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/follow-up-meeting/procedure/${procedure.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('procedureId');
      expect(response.body[0].procedureId).toBe(procedure.id);
    });

    it('etudiant liste les suivis de sa procédure', async () => {
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
      
      await createFollowUpMeeting(app, student.agent, procedure.id);

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/follow-up-meeting/procedure/${procedure.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('consultant liste les suivis d\'une procédure', async () => {
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
      
      await createFollowUpMeeting(app, student.agent, procedure.id);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get(`/api/v1/follow-up-meeting/procedure/${procedure.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('etudiant ne liste pas les suivis d\'une autre procédure', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student1 = await createStudentSession(app, 'first');
      const student2 = await createStudentSession(app, 'second');
      
      const rdv1 = await createRendezVous(app, student1.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const procedure1 = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv1.id,
      );
      
      await createFollowUpMeeting(app, student1.agent, procedure1.id);

      const rdv2 = await createRendezVous(app, student2.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(10),
        time: TimeSlot.SLOT_1400,
      });
      const procedure2 = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv2.id,
      );

      await authenticatedRequest(student2.agent)
        .get(`/api/v1/follow-up-meeting/procedure/${procedure1.id}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/follow-up-meeting/mine', () => {
    it('etudiant voit ses rendez-vous de suivi', async () => {
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
      
      await createFollowUpMeeting(app, student.agent, procedure.id);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/follow-up-meeting/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].studentId).toBe(student.user.id);
    });

    it('admin ne peut pas lister les suivis etudiant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/follow-up-meeting/mine')
        .expect(403);
    });
  });

  describe('GET /api/v1/follow-up-meeting/consultant/mine', () => {
    it('consultant voit ses rendez-vous de suivi', async () => {
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
      
      await createFollowUpMeeting(app, student.agent, procedure.id);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get('/api/v1/follow-up-meeting/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].consultantId).toBe(consultantId);
    });
  });

  describe('GET /api/v1/follow-up-meeting/:id', () => {
    it('etudiant voit son rendez-vous de suivi', async () => {
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
      expect(response.body.studentId).toBe(student.user.id);
    });

    it('consultant voit son rendez-vous de suivi', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get(`/api/v1/follow-up-meeting/${meeting.id}`)
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
      expect(response.body.consultantId).toBe(consultantId);
    });

    it('admin voit un rendez-vous de suivi', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/follow-up-meeting/${meeting.id}`)
        .expect(200);

      expect(response.body.id).toBe(meeting.id);
    });

    it('etudiant ne voit pas le rendez-vous de suivi d\'un autre', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student1 = await createStudentSession(app, 'first');
      const student2 = await createStudentSession(app, 'second');
      
      const rdv1 = await createRendezVous(app, student1.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const procedure1 = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv1.id,
      );
      const meeting = await createFollowUpMeeting(
        app,
        student1.agent,
        procedure1.id,
      );

      await authenticatedRequest(student2.agent)
        .get(`/api/v1/follow-up-meeting/${meeting.id}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/follow-up-meeting/:id/reschedule', () => {
    it('etudiant peut replanifier son rendez-vous de suivi', async () => {
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

      const newDate = getNextWorkableDate(20);
      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: newDate, time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(newDate);
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);

      // Vérifier en base
      const updatedMeeting = await prisma.followUpMeeting.findUnique({
        where: { id: meeting.id },
      });
      expect(updatedMeeting?.date.toISOString().split('T')[0]).toBe(newDate);
      expect(updatedMeeting?.time).toBe(TimeSlot.SLOT_1400);
    });

    it('consultant peut replanifier un rendez-vous de suivi', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const newDate = getNextWorkableDate(20);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: newDate, time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(newDate);
    });

    it('admin ne peut pas replanifier un rendez-vous de suivi', async () => {
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

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: getNextWorkableDate(20), time: TimeSlot.SLOT_1400 })
        .expect(403);
    });

    it('rejette une replanification sur un créneau déjà pris', async () => {
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
      
      const date = getNextWorkableDate(10);
      const meeting1 = await createFollowUpMeeting(
        app,
        student.agent,
        procedure.id,
        { date, time: TimeSlot.SLOT_1000 },
      );
      
      const student2 = await createStudentSession(app, 'second');
      const rdv2 = await createRendezVous(app, student2.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const procedure2 = await createProcedureFromRendezVous(
        app,
        admin.agent,
        rdv2.id,
      );
      const meeting2 = await createFollowUpMeeting(
        app,
        student2.agent,
        procedure2.id,
        { date: getNextWorkableDate(15), time: TimeSlot.SLOT_1400 },
      );

      // Tentative de replanification sur le créneau de meeting1
      await authenticatedRequest(student2.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting2.id}/reschedule`)
        .send({ date, time: TimeSlot.SLOT_1000 })
        .expect(400);
    });

    it('rejette une replanification sur une procédure terminée', async () => {
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
      
      // Compléter la procédure
      const steps = await prisma.step.findMany({
        where: { procedureId: procedure.id },
      });
      for (const step of steps) {
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/procedure/${procedure.id}/steps/${step.id}`)
          .send({ status: 'COMPLETED' })
          .expect(200);
      }
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      const meeting = await createFollowUpMeeting(
        app,
        student.agent,
        procedure.id,
      );

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: getNextWorkableDate(20), time: TimeSlot.SLOT_1400 })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/follow-up-meeting/:id/cancel', () => {
    it('etudiant peut annuler son rendez-vous de suivi', async () => {
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
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Annulé par étudiant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.reason).toBe('Annulé par étudiant');

      const updatedMeeting = await prisma.followUpMeeting.findUnique({
        where: { id: meeting.id },
      });
      expect(updatedMeeting?.status).toBe('CANCELLED');
    });

    it('consultant peut annuler un rendez-vous de suivi', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Annulé par consultant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('admin ne peut pas annuler un rendez-vous de suivi', async () => {
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

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Annulé par admin' })
        .expect(403);
    });

    it('ne permet pas d\'annuler moins de 24h avant', async () => {
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
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const meeting = await createFollowUpMeeting(
        app,
        student.agent,
        procedure.id,
        { date: dateStr, time: TimeSlot.SLOT_1000 },
      );

      // Modifier la date pour qu'elle soit dans moins de 24h
      await prisma.followUpMeeting.update({
        where: { id: meeting.id },
        data: { date: tomorrow },
      });

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Annulation tardive' })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/follow-up-meeting/:id/complete', () => {
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
        student.agent,
        procedure.id,
      );

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');

      const updatedMeeting = await prisma.followUpMeeting.findUnique({
        where: { id: meeting.id },
      });
      expect(updatedMeeting?.status).toBe('COMPLETED');
    });

    it('admin peut marquer un rendez-vous de suivi comme terminé', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('etudiant ne peut pas marquer un rendez-vous de suivi comme terminé', async () => {
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

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(403);
    });

    it('ne permet pas de compléter un rendez-vous de suivi annulé', async () => {
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

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Annulation' })
        .expect(200);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(400);
    });
  });
});