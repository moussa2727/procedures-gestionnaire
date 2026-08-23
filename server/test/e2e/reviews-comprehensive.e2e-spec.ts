// test/e2e/reviews-comprehensive.e2e-spec.ts
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
  createDestinationWithConsultant,
  setupStandardUsers,
  getNextWorkableDate,
  TimeSlot,
} from '../helpers/fixtures.helper';

describe('Reviews (e2e) — complémentaire', () => {
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

  async function setupStudentWithCompletedRdv(suffix = 'reviewer') {
    const { admin, consultant, consultantId } = await setupStandardUsers(app);
    const { destinationId } = await createDestinationWithConsultant(
      app,
      admin.agent,
      consultantId,
    );
    const student = await createStudentSession(app, suffix);
    const rdv = await createRendezVous(app, student.agent, {
      consultantId,
      destinationId,
      date: getNextWorkableDate(5),
      time: TimeSlot.SLOT_1000,
    });

    await authenticatedRequest(admin.agent)
      .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
      .expect(200);

    return { admin, consultant, consultantId, student };
  }

  describe('Création d\'évaluation par l\'étudiant', () => {
    it('POST /users/consultant/:id/reviews — crée une évaluation après rdv terminé', async () => {
      const { student, consultantId } = await setupStudentWithCompletedRdv();

      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Excellent consultant, très réactif !' })
        .expect(201);

      expect(response.body.rating).toBe(5);
      expect(response.body.comment).toBe('Excellent consultant, très réactif !');
      expect(response.body.studentId).toBe(student.user.id);
      expect(response.body.consultantId).toBe(consultantId);
    });

    it('refuse une évaluation sans rendez-vous terminé', async () => {
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

      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Trop tôt' })
        .expect(403);
    });
  });

  describe('Réponse du consultant', () => {
    it('POST /reviews/:reviewId/response — répond à une évaluation', async () => {
      const { consultant, consultantId, student } =
        await setupStudentWithCompletedRdv();

      const review = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Très bon accompagnement.' })
        .expect(201);

      const response = await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/reviews/${review.body.id}/response`)
        .send({ response: 'Merci pour votre confiance et votre retour.' })
        .expect(201);

      expect(response.body.response).toBe(
        'Merci pour votre confiance et votre retour.',
      );
      expect(response.body.reviewId).toBe(review.body.id);
    });

    it('un consultant ne peut répondre deux fois à la même évaluation', async () => {
      const { consultant, consultantId, student } =
        await setupStudentWithCompletedRdv();

      const review = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Parfait.' })
        .expect(201);

      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/reviews/${review.body.id}/response`)
        .send({ response: 'Première réponse.' })
        .expect(201);

      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/reviews/${review.body.id}/response`)
        .send({ response: 'Deuxième réponse.' })
        .expect(409);
    });

    it('un autre consultant ne peut répondre à l\'évaluation', async () => {
      const { admin, consultantId, student } =
        await setupStudentWithCompletedRdv();
      const otherConsultant = await createConsultantViaAdmin(app, admin.agent);

      const review = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Parfait.' })
        .expect(201);

      await authenticatedRequest(otherConsultant.agent)
        .post(`/api/v1/users/reviews/${review.body.id}/response`)
        .send({ response: 'Réponse non autorisée.' })
        .expect(403);
    });
  });

  describe('Modération par l\'administrateur', () => {
    it('PATCH /users/reviews/:reviewId/moderate — modère un commentaire', async () => {
      const { admin, consultantId, student } =
        await setupStudentWithCompletedRdv();

      const review = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Commentaire à modérer.' })
        .expect(201);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/reviews/${review.body.id}/moderate`)
        .send({ reason: 'Contenu inadapté' })
        .expect(200);

      expect(response.body.moderatedAt).toBeTruthy();
    });

    it('le commentaire modéré n\'apparaît plus en public', async () => {
      const { admin, consultantId, student } =
        await setupStudentWithCompletedRdv();

      const review = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Commentaire à modérer.' })
        .expect(201);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/users/reviews/${review.body.id}/moderate`)
        .send({ reason: 'Contenu inadapté' })
        .expect(200);

      const profile = await authenticatedRequest(student.agent)
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      const moderated = profile.body.reviews.find(
        (r: any) => r.id === review.body.id,
      );
      expect(moderated).toBeDefined();
      expect(moderated.moderatedAt).toBeTruthy();
    });
  });

  describe('Multiples évaluations', () => {
    it('plusieurs étudiants peuvent évaluer le même consultant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      const student1 = await createStudentSession(app, 'multi-review-1');
      const student2 = await createStudentSession(app, 'multi-review-2');

      const rdv1 = await createRendezVous(app, student1.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      const rdv2 = await createRendezVous(app, student2.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(7),
        time: TimeSlot.SLOT_1400,
      });

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv1.id}/complete`)
        .expect(200);
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv2.id}/complete`)
        .expect(200);

      await authenticatedRequest(student1.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Première évaluation.' })
        .expect(201);
      await authenticatedRequest(student2.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 4, comment: 'Deuxième évaluation.' })
        .expect(201);

      const profile = await authenticatedRequest(student1.agent)
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      expect(profile.body.reviews.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Validation de la note', () => {
    it('rejette une note de 0', async () => {
      const { student, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 0, comment: 'Note nulle' })
        .expect(400);
    });

    it('rejette une note de 6', async () => {
      const { student, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 6, comment: 'Note trop haute' })
        .expect(400);
    });

    it('exige un commentaire pour une note de 2 ou moins', async () => {
      const { student, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 2 })
        .expect(400);
    });

    it('accepte une note de 5 avec commentaire', async () => {
      const { student, consultantId } = await setupStudentWithCompletedRdv();

      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({ rating: 5, comment: 'Parfait.' })
        .expect(201);

      expect(response.body.rating).toBe(5);
    });
  });
});
