// test/e2e/17-reviews.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  loginAs,
  setTestApp,
  uniqueEmail,
} from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
  TEST_PASSWORD,
} from '../helpers/fixtures.helper';

describe('Reviews (e2e)', () => {
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

  describe('POST /api/v1/users/consultant/:id/reviews - Créer un avis', () => {
    it('étudiant peut évaluer un consultant après rendez-vous terminé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      // Créer et compléter un rendez-vous
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      // Évaluer le consultant
      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Excellent consultant, très professionnel !',
        })
        .expect(201);

      expect(response.body.rating).toBe(5);
      expect(response.body.comment).toBe('Excellent consultant, très professionnel !');
      expect(response.body.studentId).toBe(student.user.id);
      expect(response.body.consultantId).toBe(consultantId);

      // Vérifier en base
      const review = await prisma.consultantReview.findUnique({
        where: { id: response.body.id },
      });
      expect(review).toBeDefined();
      expect(review?.rating).toBe(5);
    });

    it('étudiant peut évaluer après une procédure terminée', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      // Créer et compléter un rendez-vous
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
        .send({ status: 'COMPLETED' })
        .expect(200);
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/procedure/${procedure.id}/complete`)
        .expect(200);

      // Évaluer le consultant
      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 4,
          comment: 'Très bon accompagnement',
        })
        .expect(201);

      expect(response.body.rating).toBe(4);
    });

    it('étudiant peut évaluer après un rendez-vous de suivi terminé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      // Créer et compléter un rendez-vous
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
        .send({ status: 'COMPLETED' })
        .expect(200);

      // Créer et compléter un rendez-vous de suivi
      const meeting = await createFollowUpMeeting(
        app,
        student.agent,
        procedure.id,
      );
      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/follow-up-meeting/${meeting.id}/complete`)
        .expect(200);

      // Évaluer le consultant
      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Excellent suivi',
        })
        .expect(201);

      expect(response.body.rating).toBe(5);
    });

    it('ne permet pas d\'évaluer sans rendez-vous terminé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      // Créer un rendez-vous sans le terminer
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Excellent !',
        })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('Vous ne pouvez évaluer ce consultant');
        });
    });

    it('exige un commentaire pour une note de 2 ou moins', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      // Note 2 sans commentaire
      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 2,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('commentaire est obligatoire');
        });

      // Note 1 sans commentaire
      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 1,
        })
        .expect(400);
    });

    it('ne permet pas d\'évaluer deux fois le même consultant', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      // Premier avis
      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Premier avis',
        })
        .expect(201);

      // Deuxième avis
      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 4,
          comment: 'Deuxième avis',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('Vous avez déjà évalué ce consultant');
        });
    });

    it('un consultant ne peut pas s\'évaluer lui-même', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Auto-évaluation',
        })
        .expect(403);
    });

    it('un consultant ne peut pas évaluer un autre consultant', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultantA = await createConsultantViaAdmin(app, admin.agent);
      const consultantB = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultantA.agent)
        .post(`/api/v1/users/consultant/${consultantB.user.id}/reviews`)
        .send({
          rating: 5,
          comment: 'Évaluation entre consultants',
        })
        .expect(403);
    });
  });

  describe('POST /api/v1/users/reviews/:reviewId/response - Répondre à un avis', () => {
    it('consultant peut répondre à un avis', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      // Créer et compléter un rendez-vous
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      // Créer un avis
      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 4,
          comment: 'Bon consultant',
        })
        .expect(201);

      // Le consultant répond
      const consultant = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/reviews/${reviewResponse.body.id}/response`)
        .send({
          response: 'Merci pour votre retour !',
        })
        .expect(200);

      expect(response.body.response).toBe('Merci pour votre retour !');
      expect(response.body.reviewId).toBe(reviewResponse.body.id);

      // Vérifier en base
      const review = await prisma.consultantReview.findUnique({
        where: { id: reviewResponse.body.id },
        include: { response: true },
      });
      expect(review?.response).toBeDefined();
      expect(review?.response?.response).toBe('Merci pour votre retour !');
    });

    it('ne permet pas de répondre deux fois', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 4,
          comment: 'Bon consultant',
        })
        .expect(201);

      const consultant = await createConsultantViaAdmin(app, admin.agent);

      // Première réponse
      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/reviews/${reviewResponse.body.id}/response`)
        .send({
          response: 'Merci pour votre retour !',
        })
        .expect(200);

      // Deuxième réponse
      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/reviews/${reviewResponse.body.id}/response`)
        .send({
          response: 'Encore merci !',
        })
        .expect(409);
    });

    it('un autre consultant ne peut pas répondre', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 4,
          comment: 'Bon consultant',
        })
        .expect(201);

      const otherConsultant = await createConsultantViaAdmin(app, admin.agent, 'other');

      await authenticatedRequest(otherConsultant.agent)
        .post(`/api/v1/users/reviews/${reviewResponse.body.id}/response`)
        .send({
          response: 'Merci !',
        })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/reviews/:reviewId/moderate - Modérer un avis', () => {
    it('admin peut modérer un avis', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 1,
          comment: 'Contenu inapproprié',
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/reviews/${reviewResponse.body.id}/moderate`)
        .send({
          reason: 'Contenu inapproprié',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.moderatedAt).toBeDefined();
          expect(res.body.moderationReason).toBe('Contenu inapproprié');
        });

      // Vérifier en base
      const review = await prisma.consultantReview.findUnique({
        where: { id: reviewResponse.body.id },
      });
      expect(review?.moderatedAt).toBeDefined();
      expect(review?.moderationReason).toBe('Contenu inapproprié');
    });

    it('étudiant ne peut pas modérer un avis', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 1,
          comment: 'Test',
        })
        .expect(201);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/users/reviews/${reviewResponse.body.id}/moderate`)
        .send({
          reason: 'Test',
        })
        .expect(403);
    });
  });

  describe('Affichage des avis', () => {
    it('affiche les avis dans le profil public du consultant', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Super consultant !',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      expect(response.body.reviews).toBeDefined();
      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.reviews.length).toBeGreaterThan(0);
      expect(response.body.reviews[0]).toHaveProperty('rating');
      expect(response.body.reviews[0]).toHaveProperty('comment');
      expect(response.body.reviews[0]).toHaveProperty('createdAt');
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalReviews).toBeGreaterThan(0);
      expect(response.body.stats.rating).toBe(5);
    });

    it('masque les commentaires des avis modérés', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const reviewResponse = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 1,
          comment: 'Commentaire modéré',
        })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/reviews/${reviewResponse.body.id}/moderate`)
        .send({
          reason: 'Contenu inapproprié',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      const review = response.body.reviews.find((r: any) => r.id === reviewResponse.body.id);
      expect(review).toBeDefined();
      expect(review.comment).toBeNull();
    });
  });

  describe('Calcul des statistiques', () => {
    it('calcule correctement la note moyenne', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      // Créer 3 avis avec des notes différentes
      const ratings = [5, 4, 3];
      for (let i = 0; i < ratings.length; i++) {
        const student = await createStudentSession(app, `review-${i}`);
        const rdv = await createRendezVous(app, student.agent, {
          consultantId,
          destinationId,
          date: getNextWorkableDate(5 + i),
          time: TimeSlot.SLOT_1000,
        });

        await authenticatedRequest(admin.agent)
          .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
          .expect(200);

        await authenticatedRequest(student.agent)
          .post(`/api/v1/users/consultant/${consultantId}/reviews`)
          .send({
            rating: ratings[i],
            comment: `Avis ${i + 1}`,
          })
          .expect(201);
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      expect(response.body.stats.totalReviews).toBe(3);
      expect(response.body.stats.rating).toBe(4); // (5+4+3)/3 = 4
    });
  });
});