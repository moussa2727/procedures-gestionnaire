// test/e2e/08-procedures.e2e-spec.ts
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
          stepNames: ['Dossier', 'Visa', 'Billet'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('numeroDossier');
      expect(response.body.steps).toHaveLength(3);
      expect(response.body.status).toBe(ProcedureStatus.IN_PROGRESS);
      
      // Vérifier les étapes
      expect(response.body.steps[0].stepName).toBe('Dossier');
      expect(response.body.steps[0].status).toBe(StepStatus.PENDING);
      expect(response.body.steps[0].orderIndex).toBe(0);
      
      // Vérifier en base
      const procedure = await prisma.procedure.findUnique({
        where: { id: response.body.id },
        include: { steps: true },
      });
      expect(procedure).toBeDefined();
      expect(procedure?.steps).toHaveLength(3);
    });

    it('consultant peut créer une procédure depuis un rendez-vous', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.steps).toHaveLength(1);
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

    it('rejette un rendez-vous inexistant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: '00000000-0000-0000-0000-000000000000',
          stepNames: ['Dossier'],
        })
        .expect(404);
    });

    it('rejette une procédure déjà existante', async () => {
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

      await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Visa'],
        })
        .expect(400);
    });

    it('rejette sans étapes', async () => {
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

      await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: [],
        })
        .expect(400);
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
      
      const rdv1 = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      await createProcedureFromRendezVous(app, admin.agent, rdv1.id);

      const rdv2 = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(10),
        time: TimeSlot.SLOT_1400,
      });
      await createProcedureFromRendezVous(app, admin.agent, rdv2.id);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/procedure/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('studentId');
      expect(response.body[0].studentId).toBe(student.user.id);
      expect(response.body[0]).toHaveProperty('numeroDossier');
      expect(response.body[0]).toHaveProperty('steps');
    });

    it('admin ne peut pas lister les procédures etudiant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/procedure/mine')
        .expect(403);
    });
  });

  describe('GET /api/v1/procedure/consultant/mine', () => {
    it('consultant voit ses procédures', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get('/api/v1/procedure/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].consultantId).toBe(consultantId);
    });
  });

  describe('GET /api/v1/procedure/admin/all', () => {
    it('admin voit toutes les procédures', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/procedure/admin/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('consultant ne peut pas lister toutes les procédures', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/procedure/admin/all')
        .expect(403);
    });
  });

  describe('GET /api/v1/procedure/dossier/:numeroDossier', () => {
    it('récupère une procédure par numéro de dossier', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/procedure/dossier/${procedure.numeroDossier}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
      expect(response.body.numeroDossier).toBe(procedure.numeroDossier);
    });

    it('retourne 404 pour un dossier inexistant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/procedure/dossier/INEXISTANT-123')
        .expect(404);
    });
  });

  describe('GET /api/v1/procedure/:id', () => {
    it('admin voit une procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
    });

    it('etudiant voit sa procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
    });

    it('consultant voit sa procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
    });

    it('etudiant ne voit pas la procédure d\'un autre', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student1 = await createStudentSession(app, 'first');
      const student2 = await createStudentSession(app, 'second');
      
      const rdv = await createRendezVous(app, student1.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      await authenticatedRequest(student2.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/procedure/:id/steps/:stepId', () => {
    it('admin met à jour une étape', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);

      expect(response.body.steps[0].status).toBe(StepStatus.COMPLETED);

      // Vérifier en base
      const step = await prisma.step.findUnique({ where: { id: stepId } });
      expect(step?.status).toBe(StepStatus.COMPLETED);
    });

    it('consultant met à jour une étape', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);

      expect(response.body.steps[0].status).toBe(StepStatus.COMPLETED);
    });

    it('rejette une étape avec motif obligatoire', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.REJECTED })
        .expect(400);
    });

    it('rejette une étape déjà rejetée', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      // Rejeter l'étape
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.REJECTED, rejectionReason: 'Motif' })
        .expect(200);

      // Tenter de la modifier
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(400);
    });

    it('cascade le rejet sur les étapes suivantes', async () => {
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
        ['Dossier', 'Visa', 'Billet']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId = steps[0].id;

      // Rejeter la première étape
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId}`)
        .send({ status: StepStatus.REJECTED, rejectionReason: 'Motif' })
        .expect(200);

      // Vérifier que les étapes suivantes sont rejetées en cascade
      const updatedSteps = await prisma.step.findMany({
        where: { procedureId: procedure.id },
        orderBy: { orderIndex: 'asc' },
      });
      expect(updatedSteps[0].status).toBe(StepStatus.REJECTED);
      expect(updatedSteps[1].status).toBe(StepStatus.REJECTED);
      expect(updatedSteps[2].status).toBe(StepStatus.REJECTED);
      expect(updatedSteps[1].rejectionReason).toContain('cascade');
    });

    it('empêche de valider une étape avec une étape précédente rejetée', async () => {
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
        ['Dossier', 'Visa', 'Billet']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId1 = steps[0].id;
      const stepId2 = steps[1].id;

      // Rejeter la première étape
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId1}`)
        .send({ status: StepStatus.REJECTED, rejectionReason: 'Motif' })
        .expect(200);

      // Tenter de valider la deuxième étape
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId2}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(400);
    });

    it('nécessite que l\'étape précédente soit complétée', async () => {
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
        ['Dossier', 'Visa', 'Billet']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;
      const stepId2 = steps[1].id;

      // Tenter de valider la deuxième étape sans valider la première
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${stepId2}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/procedure/:id/complete', () => {
    it('admin clôture une procédure', async () => {
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
        ['Dossier', 'Visa']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      // Valider toutes les étapes
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

      const updatedProcedure = await prisma.procedure.findUnique({
        where: { id: procedure.id },
      });
      expect(updatedProcedure?.status).toBe(ProcedureStatus.COMPLETED);
    });

    it('consultant clôture une procédure', async () => {
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
        ['Dossier']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.COMPLETED);
    });

    it('etudiant ne peut pas clôturer une procédure', async () => {
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
        ['Dossier']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.COMPLETED })
        .expect(200);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(403);
    });

    it('rejette avec des étapes non terminées', async () => {
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
        ['Dossier', 'Visa']
      );

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(400);
    });

    it('rejette avec des étapes rejetées', async () => {
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
        ['Dossier', 'Visa']
      );
      const steps = (procedure.body as { steps: Array<{ id: string }> }).steps;

      // Rejeter une étape
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/steps/${steps[0].id}`)
        .send({ status: StepStatus.REJECTED, rejectionReason: 'Motif' })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(400);
    });
  });

  describe('PATCH /api/v1/procedure/:id/reject', () => {
    it('admin rejette une procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.REJECTED);
      expect(response.body.cancellationReason).toBe('Dossier incomplet');

      const updatedProcedure = await prisma.procedure.findUnique({
        where: { id: procedure.id },
      });
      expect(updatedProcedure?.status).toBe(ProcedureStatus.REJECTED);
    });

    it('consultant rejette une procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.REJECTED);
    });

    it('etudiant ne peut pas rejeter une procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet' })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/procedure/:id/cancel', () => {
    it('admin annule une procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulé par admin' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.CANCELLED);
      expect(response.body.cancellationReason).toBe('Annulé par admin');
    });

    it('etudiant annule sa procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulé par étudiant' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.CANCELLED);
    });

    it('consultant ne peut pas annuler une procédure', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulé par consultant' })
        .expect(403);
    });

    it('cascade l\'annulation sur les étapes et rendez-vous de suivi', async () => {
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
        ['Dossier', 'Visa']
      );

      // Créer un rendez-vous de suivi
      await authenticatedRequest(student.agent)
        .post('/api/v1/follow-up-meeting')
        .send({
          procedureId: procedure.id,
          date: getNextWorkableDate(10),
          time: TimeSlot.SLOT_1000,
          reason: 'Suivi',
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulation' })
        .expect(200);

      // Vérifier que les étapes sont annulées
      const steps = await prisma.step.findMany({
        where: { procedureId: procedure.id },
      });
      expect(steps.every(s => s.status === StepStatus.REJECTED)).toBe(true);

      // Vérifier que les rendez-vous de suivi sont annulés
      const meetings = await prisma.followUpMeeting.findMany({
        where: { procedureId: procedure.id },
      });
      expect(meetings.every(m => m.status === 'CANCELLED')).toBe(true);
    });
  });

  describe('POST /api/v1/procedure/:id/comments', () => {
    it('admin ajoute un commentaire', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire admin' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Commentaire admin');
      expect(response.body.authorId).toBe(admin.user.id);
    });

    it('etudiant ajoute un commentaire', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire étudiant' })
        .expect(201);

      expect(response.body.content).toBe('Commentaire étudiant');
      expect(response.body.authorId).toBe(student.user.id);
    });

    it('consultant ajoute un commentaire', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire consultant' })
        .expect(201);

      expect(response.body.content).toBe('Commentaire consultant');
    });

    it('rejette un commentaire trop long (>2000)', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'a'.repeat(2001) })
        .expect(400);
    });

    it('rejette un commentaire vide', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: '' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/procedure/:id/comments/:commentId', () => {
    it('admin supprime un commentaire', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const commentResponse = await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire à supprimer' })
        .expect(201);

      const commentId = commentResponse.body.id;

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/procedure/${procedure.id}/comments/${commentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const comment = await prisma.procedureComment.findUnique({
        where: { id: commentId },
      });
      expect(comment).toBeNull();
    });

    it('etudiant supprime son propre commentaire', async () => {
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
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const commentResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire étudiant' })
        .expect(201);

      const commentId = commentResponse.body.id;

      await authenticatedRequest(student.agent)
        .delete(`/api/v1/procedure/${procedure.id}/comments/${commentId}`)
        .expect(200);
    });

    it('etudiant ne supprime pas le commentaire d\'un autre', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student1 = await createStudentSession(app, 'first');
      const student2 = await createStudentSession(app, 'second');
      
      const rdv = await createRendezVous(app, student1.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      const commentResponse = await authenticatedRequest(student1.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire étudiant 1' })
        .expect(201);

      const commentId = commentResponse.body.id;

      await authenticatedRequest(student2.agent)
        .delete(`/api/v1/procedure/${procedure.id}/comments/${commentId}`)
        .expect(403);
    });
  });
});