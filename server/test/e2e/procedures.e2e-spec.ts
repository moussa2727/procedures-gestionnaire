// test/e2e/procedures.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createRendezVous,
  createProcedureFromRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  StepStatus,
  ProcedureStatus,
  TimeSlot,
} from '../helpers/fixtures.helper';

describe('ProcedureController (e2e)', () => {
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

  describe('POST /api/v1/procedure — créer une procédure', () => {
    it('admin peut créer une procédure depuis un rendez-vous', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier', 'Visa'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('numeroDossier');
      expect(response.body.steps).toHaveLength(2);
    });

    it('consultant peut créer une procédure depuis un rendez-vous', async () => {
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

      // Use the original consultant's session (the one assigned to the rendez-vous)
      const response = await authenticatedRequest(consultant.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('etudiant ne peut pas créer une procédure', async () => {
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

      await authenticatedRequest(student.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/procedure/mine — lister mes procédures', () => {
    it('etudiant voit ses procédures', async () => {
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
      await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/procedure/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/v1/procedure/:id — détail procédure', () => {
    it('admin peut voir une procédure', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
    });
  });

  describe('PATCH /api/v1/procedure/:id/steps/:stepId — mettre à jour une étape', () => {
    it('admin peut mettre à jour une étape', async () => {
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
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);

      expect(response.body.steps[0].status).toBe(StepStatus.COMPLETED);
    });
  });

  describe('PATCH /api/v1/procedure/:id/complete — clôturer une procédure', () => {
    it('admin peut clôturer une procédure', async () => {
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

      // Complete all steps first
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      for (const step of steps) {
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/procedure/${procedure.id}/steps/${step.id}`)
          .send({ status: StepStatus.COMPLETED })
          .expect(200);
      }

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.COMPLETED);
    });
  });

  describe('PATCH /api/v1/procedure/:id/reject — rejeter une procédure', () => {
    it('admin peut rejeter une procédure', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.REJECTED);
    });
  });

  describe('POST /api/v1/procedure/:id/comments — ajouter un commentaire', () => {
    it('admin peut ajouter un commentaire', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire admin' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      const comments = response.body.comments as Array<{ content: string }>;
      expect(comments[comments.length - 1].content).toBe('Commentaire admin');
    });
  });
});