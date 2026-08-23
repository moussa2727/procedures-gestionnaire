// test/e2e/consultant.e2e-spec.ts - Consultant Perspective Tests
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
  setupStandardUsers,
  createRendezVous,
  createProcedureFromRendezVous,
  createFollowUpMeeting,
  getNextWorkableDate,
  TimeSlot,
  createTestImageBuffer,
} from '../helpers/fixtures.helper';

describe('Consultant Perspective (e2e)', () => {
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

  describe('Consultant Dashboard', () => {
    it('consultant peut voir son profil', async () => {
      const { consultant } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/users/consultant/me')
        .expect(200);

      expect(response.body.id).toBe(consultant.user.id);
    });

    it('consultant peut lister ses étudiants', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .get(`/api/v1/users/consultant/${consultantId}/students`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('consultant peut voir ses notifications', async () => {
      const { consultant } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/notifications')
        .expect(200);

      // Response might be array or paginated object
      const notifications = Array.isArray(response.body)
        ? response.body
        : response.body.items || response.body.data || [];
      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  describe('Consultant Rendez-vous Management', () => {
    it('consultant peut lister ses rendez-vous', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
      });

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/rendez-vous/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('consultant peut donner un avis sur un rendez-vous', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
      });

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: 'FAVORABLE' })
        .expect(200);

      expect(response.body.opinion).toBe('FAVORABLE');
    });

    it('consultant peut marquer un rendez-vous comme terminé', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
      });

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('consultant peut annuler un rendez-vous', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
      });

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulé par le consultant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('Consultant Procedure Management', () => {
    it('consultant peut lister ses procédures', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await createProcedureFromRendezVous(app, consultant.agent, rdv.id);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/procedure/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('consultant peut créer une procédure depuis un rendez-vous', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      const response = await authenticatedRequest(consultant.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier', 'Visa'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.steps).toHaveLength(2);
    });

    it('consultant peut mettre à jour une étape de procédure', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.steps[0].status).toBe('COMPLETED');
    });

    it('consultant peut clôturer une procédure', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      // Complete all steps first
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      for (const step of steps) {
        await authenticatedRequest(consultant.agent)
          .patch(`/api/v1/procedure/${procedure.id}/steps/${step.id}`)
          .send({ status: 'COMPLETED' })
          .expect(200);
      }

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('consultant peut rejeter une procédure', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet' })
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
    });

    it('consultant ne peut pas annuler une procédure (doit utiliser rejet)', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      // CONSULTANT cannot cancel - only ETUDIANT and ADMIN can
      await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulé par le consultant' })
        .expect(403);
    });

    it('consultant peut ajouter un commentaire à une procédure', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const response = await authenticatedRequest(consultant.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire consultant' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      // Response is ProcedureResponseDto, not the comment itself
    });
  });

  describe('Consultant Follow-up Meeting Management', () => {
    it('consultant peut créer un rendez-vous de suivi', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const response = await authenticatedRequest(consultant.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
          reason: 'Suivi de procédure',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.procedureId).toBe(procedure.id);
    });

    it('consultant peut lister ses rendez-vous de suivi', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      await createFollowUpMeeting(app, consultant.agent, procedure.id);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/follow-up-meeting/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('consultant peut marquer un rendez-vous de suivi comme terminé', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const meeting = await createFollowUpMeeting(
        app,
        consultant.agent,
        procedure.id,
      );

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('consultant peut replanifier un rendez-vous de suivi', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const meeting = await createFollowUpMeeting(
        app,
        consultant.agent,
        procedure.id,
      );

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/reschedule`)
        .send({ date: getNextWorkableDate(15), time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(getNextWorkableDate(15));
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);
    });

    it('consultant peut annuler un rendez-vous de suivi', async () => {
      const { consultant, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
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
        consultant.agent,
        rdv.id,
      );

      const meeting = await createFollowUpMeeting(
        app,
        consultant.agent,
        procedure.id,
      );

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/cancel`)
        .send({ reason: 'Annulé par le consultant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('Consultant Absence Management', () => {
    it('consultant peut déclarer une absence', async () => {
      const { consultant } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: 'CONGES',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.consultantId).toBe(consultant.user.id);
    });

    it('consultant peut lister ses absences', async () => {
      const { consultant } = await setupStandardUsers(app);

      // Create an absence first
      await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: 'CONGES',
        })
        .expect(201);

      const response = await authenticatedRequest(consultant.agent)
        .get('/api/v1/consultant-unavailability/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('consultant peut supprimer une absence', async () => {
      const { consultant } = await setupStandardUsers(app);

      const createResponse = await authenticatedRequest(consultant.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: 'CONGES',
        })
        .expect(201);

      await authenticatedRequest(consultant.agent)
        .delete(`/api/v1/consultant-unavailability/${createResponse.body.id}`)
        .expect(200);
    });
  });

  describe('Consultant Profile Management', () => {
    it('consultant peut modifier son profil', async () => {
      const { consultant } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .put('/api/v1/users/me')
        .send({ firstName: 'UpdatedFirstName' })
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedFirstName');
    });

    it('consultant peut uploader une photo', async () => {
      const { consultant } = await setupStandardUsers(app);

      const response = await authenticatedRequest(consultant.agent)
        .put('/api/v1/users/consultant/photo')
        .attach('photo', createTestImageBuffer(), 'photo.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();
    });
  });

  describe('Authorization Tests', () => {
    it('étudiant ne peut pas accéder aux routes consultant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/rendez-vous/consultant/mine')
        .expect(403);
    });

    it('étudiant ne peut pas créer de procédure', async () => {
      const { student, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(student.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        })
        .expect(403);
    });

    it('étudiant ne peut pas déclarer d\'absence consultant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/consultant-unavailability/mine')
        .send({
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          type: 'CONGES',
        })
        .expect(403);
    });

    it('consultant ne peut pas accéder aux routes admin', async () => {
      const { consultant } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/users')
        .expect(403);
    });
  });
});
