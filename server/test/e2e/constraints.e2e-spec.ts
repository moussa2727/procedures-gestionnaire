// test/e2e/constraints.e2e-spec.ts - Business Constraint Validation Tests
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createStudentSession,
  createDestinationWithConsultant,
  setupStandardUsers,
  createRendezVous,
  createProcedureFromRendezVous,
  getNextWorkableDate,
  TimeSlot,
  StepStatus,
  ProcedureStatus,
} from '../helpers/fixtures.helper';

describe('Business Constraints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let admin: any;
  let consultant: any;
  let consultantId: string;
  let destinationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);
    const users = await setupStandardUsers(app);
    admin = users.admin;
    consultant = users.consultant;
    consultantId = users.consultantId;

    const dest = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );
    destinationId = dest.destinationId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step Modification Rules', () => {
    it('can modify step B when step A is COMPLETED', async () => {
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
        ['Step A', 'Step B', 'Step C'],
      );

      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.IN_PROGRESS })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[1].id}`)
        .send({ status: StepStatus.IN_PROGRESS })
        .expect(200);

      expect(response.body.status).toBe(StepStatus.IN_PROGRESS);
    });

    it('cannot modify step B when step A is PENDING', async () => {
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
        ['Step A', 'Step B', 'Step C'],
      );

      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[1].id}`)
        .send({ status: StepStatus.IN_PROGRESS });

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('Rejection Cascade Behavior', () => {
    it('rejecting step C cascades to steps D and E but preserves A and B', async () => {
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
        ['Step A', 'Step B', 'Step C', 'Step D', 'Step E'],
      );

      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      for (let i = 0; i < 2; i++) {
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[i].id}`)
          .send({ status: StepStatus.IN_PROGRESS })
          .expect(200);
        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[i].id}`)
          .send({ status: StepStatus.COMPLETED })
          .expect(200);
      }

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[2].id}`)
        .send({ status: StepStatus.REJECTED, rejectionReason: 'Documentation' })
        .expect(200);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      const updatedSteps = response.body.steps;

      expect(updatedSteps[0].status).toBe(StepStatus.COMPLETED);
      expect(updatedSteps[1].status).toBe(StepStatus.COMPLETED);
      expect(updatedSteps[2].status).toBe(StepStatus.REJECTED);
      expect(updatedSteps[3].status).toBe(StepStatus.REJECTED);
      expect(updatedSteps[4].status).toBe(StepStatus.REJECTED);
      expect(response.body.status).toBe(ProcedureStatus.IN_PROGRESS);
    });
  });

  describe('Role-Based Permissions', () => {
    it('ETUDIANT cannot modify steps', async () => {
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
        ['Step A', 'Step B'],
      );

      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(403);
    });

    it('ETUDIANT can cancel own procedure', async () => {
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
        ['Step A', 'Step B'],
      );

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Changement de projet' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.CANCELLED);
    });

    it('CONSULTANT cannot cancel a procedure', async () => {
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
        ['Step A'],
      );

      await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulé' })
        .expect(403);
    });

    it('CONSULTANT can reject a procedure', async () => {
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
        ['Step A'],
      );

      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.REJECTED);
    });
  });

  describe('Terminal State Protection', () => {
    it('cannot modify steps on COMPLETED procedure', async () => {
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
        ['Step A'],
      );

      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.IN_PROGRESS })
        .expect(200);
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.PENDING });

      expect([400, 403]).toContain(response.status);
    });

    it('cannot reject already REJECTED procedure', async () => {
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
        ['Step A'],
      );

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Rejected' })
        .expect(200);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Rejected again' });

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('Comment Permissions', () => {
    it('can add comment to active procedure', async () => {
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
        ['Step A'],
      );

      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Question' })
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('ADMIN can delete any comment', async () => {
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
        ['Step A'],
      );

      const commentResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Mon commentaire' })
        .expect(201);

      const procedureWithComments = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      const commentId = procedureWithComments.body.comments[0].id;

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/procedure/${procedure.id}/comments/${commentId}`)
        .expect(200);
    });
  });

  describe('Procedure Creation Constraints', () => {
    it('cannot create procedure with empty step names', async () => {
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
          stepNames: [],
        });

      expect(400).toBe(response.status);
    });

    it('ETUDIANT cannot create procedure', async () => {
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
          stepNames: ['Step A'],
        })
        .expect(403);
    });
  });
});
