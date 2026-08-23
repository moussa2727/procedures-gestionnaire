// test/e2e/procedures-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createStudentSession,
  createRendezVous,
  createProcedureFromRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
  ProcedureStatus,
  StepStatus,
} from '../helpers/fixtures.helper';

describe('ProcedureController (e2e) — complémentaire', () => {
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
    const procedure = await createProcedureFromRendezVous(app, admin.agent, rdv.id, [
      'Dossier',
      'Visa',
      'Billet',
    ]);
    return { admin, consultantId, student, rdv, procedure };
  }

  describe('Commentaires', () => {
    it('POST /procedure/:id/comments — crée un commentaire', async () => {
      const { admin, procedure } = await setupProcedure();

      const response = await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire administrateur sur la procédure.' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      const comments = response.body.comments;
      expect(comments.length).toBeGreaterThan(0);
      expect(comments[comments.length - 1].content).toBe(
        'Commentaire administrateur sur la procédure.',
      );
    });

    it('DELETE /procedure/:id/comments/:commentId — supprime un commentaire', async () => {
      const { admin, student, procedure } = await setupProcedure();

      const created = await authenticatedRequest(admin.agent)
        .post(`/api/v1/procedure/${procedure.id}/comments`)
        .send({ content: 'Commentaire à supprimer.' })
        .expect(201);

      const commentId = created.body.comments[created.body.comments.length - 1].id;

      await authenticatedRequest(student.agent)
        .delete(`/api/v1/procedure/${procedure.id}/comments/${commentId}`)
        .expect(403);

      const removed = await authenticatedRequest(admin.agent)
        .delete(`/api/v1/procedure/${procedure.id}/comments/${commentId}`)
        .expect(200);

      expect(removed.body.success).toBe(true);
    });
  });

  describe('Recherche par numéro de dossier', () => {
    it('GET /procedure/dossier/:numeroDossier — récupère la procédure', async () => {
      const { admin, student, procedure } = await setupProcedure();

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/procedure/dossier/${procedure.numeroDossier}`)
        .expect(200);

      expect(response.body.id).toBe(procedure.id);
      expect(response.body.numeroDossier).toBe(procedure.numeroDossier);
    });

    it('retourne 404 pour un numéro de dossier inexistant', async () => {
      const { student } = await setupProcedure();

      await authenticatedRequest(student.agent)
        .get('/api/v1/procedure/dossier/numDossier-inexistant')
        .expect(404);
    });
  });

  describe('Ordre des étapes', () => {
    it('les étapes sont créées dans l\'ordre fourni', async () => {
      const { admin, procedure } = await setupProcedure();

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .expect(200);

      const steps = response.body.steps;
      expect(steps).toHaveLength(3);
      expect(steps.map((s: any) => s.stepName)).toEqual([
        'Dossier',
        'Visa',
        'Billet',
      ]);
      steps.forEach((step: any, index: number) => {
        expect(step.orderIndex).toBe(index);
      });
    });
  });

  describe('Clôture (complete) d\'une procédure', () => {
    it('complete toutes les étapes puis clôt la procédure', async () => {
      const { admin, procedure } = await setupProcedure();

      // Les étapes sont créées dans l'ordre : chaque étape ne peut être
      // validée que si l'étape immédiatement précédente est complétée.
      const steps = await authenticatedRequest(admin.agent)
        .get(`/api/v1/procedure/${procedure.id}`)
        .then((res) => res.body.steps);

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
      expect(response.body.steps.every((s: any) => s.status === StepStatus.COMPLETED)).toBe(true);
    });
  });

  describe('Rejet d\'une procédure', () => {
    it('PATCH /procedure/:id/reject — rejette la procédure', async () => {
      const { admin, procedure } = await setupProcedure();

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/reject`)
        .send({ reason: 'Dossier incomplet fourni par l\'étudiant.' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.REJECTED);
    });
  });

  describe('Annulation d\'une procédure', () => {
    it('PATCH /procedure/:id/cancel — annule par l\'étudiant', async () => {
      const { student, procedure } = await setupProcedure();

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Plus disponible à cette date.' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.CANCELLED);
    });

    it('PATCH /procedure/:id/cancel — annule par l\'administrateur', async () => {
      const { admin, procedure } = await setupProcedure();

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulation administrative.' })
        .expect(200);

      expect(response.body.status).toBe(ProcedureStatus.CANCELLED);
    });

    it('cascade l\'annulation sur les étapes actives', async () => {
      const { admin, procedure } = await setupProcedure();

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/cancel`)
        .send({ reason: 'Annulation administrative.' })
        .expect(200);

      const current = await prisma.procedure.findUnique({
        where: { id: procedure.id },
        include: { steps: true },
      });
      expect(current.status).toBe(ProcedureStatus.CANCELLED);
      expect(
        current.steps.every((s) => s.status === StepStatus.REJECTED),
      ).toBe(true);
    });
  });

  describe('Création conditionnée par le statut du rendez-vous', () => {
    it('refuse de créer une procédure depuis un rendez-vous non confirmé', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Je ne peux plus' })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({ rendezVousId: rdv.id, stepNames: ['Dossier'] })
        .expect(400);
    });
  });
});
