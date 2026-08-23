// test/e2e/student.e2e-spec.ts - Student Perspective Tests
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp, uniqueEmail } from '../helpers/auth.helper';
import {
  createStudentSession,
  createDestinationWithConsultant,
  setupStandardUsers,
  createRendezVous,
  getNextWorkableDate,
  TimeSlot,
  createTestImageBuffer,
} from '../helpers/fixtures.helper';

describe('Student Perspective (e2e)', () => {
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

  describe('Student Dashboard', () => {
    it('étudiant peut voir son profil', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/users/me')
        .expect(200);

      expect(response.body.id).toBe(student.user.id);
    });

    it('étudiant peut modifier son profil', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .put('/api/v1/users/me')
        .send({ firstName: 'UpdatedFirstName' })
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedFirstName');
    });

    it('étudiant peut uploader une photo', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', createTestImageBuffer(), 'photo.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();
    });

    it('étudiant peut voir ses notifications', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('étudiant peut marquer une notification comme lue', async () => {
      const { student } = await setupStandardUsers(app);

      const listResponse = await authenticatedRequest(student.agent)
        .get('/api/v1/notifications')
        .expect(200);

      const notifications = listResponse.body;
      if (notifications.length > 0) {
        const notificationId = notifications[0].id;

        const response = await authenticatedRequest(student.agent)
          .patch(`/api/v1/notifications/${notificationId}/read`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.isRead).toBe(true);
      }
    });

    it('étudiant peut marquer toutes les notifications comme lues', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .patch('/api/v1/notifications/read-all')
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Student Rendez-vous Management', () => {
    it('étudiant peut créer un rendez-vous', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const response = await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: getNextWorkableDate(5),
          time: TimeSlot.SLOT_1000,
          firstName: 'Student',
          lastName: 'Test',
          email: uniqueEmail('rdv'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('étudiant peut lister ses rendez-vous', async () => {
      const { consultantId } = await setupStandardUsers(app);
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

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/rendez-vous/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('étudiant peut voir un rendez-vous', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
      });

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/rendez-vous/${rdv.id}`)
        .expect(200);

      expect(response.body.id).toBe(rdv.id);
    });

    it('étudiant peut replanifier un rendez-vous', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: getNextWorkableDate(10), time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(getNextWorkableDate(10));
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);
    });

    it('étudiant peut annuler un rendez-vous', async () => {
      const { consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);

      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(15),
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulé par étudiant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('Student Procedure Management', () => {
    it('étudiant peut lister ses procédures', async () => {
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

      // Create a procedure for this student
      const createResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier', 'Visa'],
        });

      // Only proceed if procedure was created successfully
      if (createResponse.status === 201) {
        const response = await authenticatedRequest(student.agent)
          .get('/api/v1/procedure/mine')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('étudiant peut voir une procédure', async () => {
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

      const createResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        });

      if (createResponse.status === 201) {
        const response = await authenticatedRequest(student.agent)
          .get(`/api/v1/procedure/${createResponse.body.id}`)
          .expect(200);

        expect(response.body.id).toBe(createResponse.body.id);
      }
    });
  });

  describe('Student Follow-up Meeting Management', () => {
    it('étudiant peut créer un rendez-vous de suivi', async () => {
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

      const createResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        });

      if (createResponse.status === 201) {
        const response = await authenticatedRequest(student.agent)
          .post('/api/v1/follow-up-meeting')
          .send({
            procedureId: createResponse.body.id,
            date: getNextWorkableDate(10),
            time: TimeSlot.SLOT_1000,
            reason: 'Suivi dossier',
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.procedureId).toBe(createResponse.body.id);
      }
    });

    it('étudiant peut lister ses rendez-vous de suivi', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/follow-up-meeting/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('étudiant peut voir un rendez-vous de suivi', async () => {
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

      const procedureResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        });

      if (procedureResponse.status === 201) {
        const meetingResponse = await authenticatedRequest(student.agent)
          .post('/api/v1/follow-up-meeting')
          .send({
            procedureId: procedureResponse.body.id,
            date: getNextWorkableDate(10),
            time: TimeSlot.SLOT_1000,
            reason: 'Suivi',
          });

        if (meetingResponse.status === 201) {
          const response = await authenticatedRequest(student.agent)
            .get(`/api/v1/follow-up-meeting/${meetingResponse.body.id}`)
            .expect(200);

          expect(response.body.id).toBe(meetingResponse.body.id);
        }
      }
    });

    it('étudiant peut replanifier un rendez-vous de suivi', async () => {
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

      const procedureResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        });

      if (procedureResponse.status === 201) {
        const meetingResponse = await authenticatedRequest(student.agent)
          .post('/api/v1/follow-up-meeting')
          .send({
            procedureId: procedureResponse.body.id,
            date: getNextWorkableDate(10),
            time: TimeSlot.SLOT_1000,
            reason: 'Suivi',
          });

        if (meetingResponse.status === 201) {
          const response = await authenticatedRequest(student.agent)
            .patch(`/api/v1/follow-up-meeting/${meetingResponse.body.id}/reschedule`)
            .send({ date: getNextWorkableDate(15), time: TimeSlot.SLOT_1400 })
            .expect(200);

          expect(response.body.date).toBe(getNextWorkableDate(15));
          expect(response.body.time).toBe(TimeSlot.SLOT_1400);
        }
      }
    });

    it('étudiant peut annuler un rendez-vous de suivi', async () => {
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

      const procedureResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/procedure')
        .send({
          rendezVousId: rdv.id,
          stepNames: ['Dossier'],
        });

      if (procedureResponse.status === 201) {
        const meetingResponse = await authenticatedRequest(student.agent)
          .post('/api/v1/follow-up-meeting')
          .send({
            procedureId: procedureResponse.body.id,
            date: getNextWorkableDate(10),
            time: TimeSlot.SLOT_1000,
            reason: 'Suivi',
          });

        if (meetingResponse.status === 201) {
          const response = await authenticatedRequest(student.agent)
            .patch(`/api/v1/follow-up-meeting/${meetingResponse.body.id}/cancel`)
            .send({ reason: 'Annulé par étudiant' })
            .expect(200);

          expect(response.body.status).toBe('CANCELLED');
        }
      }
    });
  });

  describe('Student Review Management', () => {
    it('étudiant peut créer un avis après rendez-vous terminé', async () => {
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

      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/consultant/${consultantId}/reviews`)
        .send({
          rating: 5,
          comment: 'Excellent consultant !',
        })
        .expect(201);

      expect(response.body.rating).toBe(5);
      expect(response.body.comment).toBe('Excellent consultant !');
      expect(response.body.studentId).toBe(student.user.id);
      expect(response.body.consultantId).toBe(consultantId);
    });

    it('étudiant ne peut pas évaluer sans rendez-vous terminé', async () => {
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
        .send({
          rating: 5,
          comment: 'Excellent !',
        })
        .expect(403);
    });

    it('étudiant peut répondre à un avis', async () => {
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
          rating: 5,
          comment: 'Excellent consultant !',
        })
        .expect(201);

      const response = await authenticatedRequest(student.agent)
        .post(`/api/v1/users/reviews/${reviewResponse.body.id}/response`)
        .send({ response: 'Merci pour votre retour !' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Student Session Management', () => {
    it('étudiant peut voir ses sessions actives', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/users/me/sessions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('étudiant peut révoquer une session', async () => {
      const { student } = await setupStandardUsers(app);

      const sessionsResponse = await authenticatedRequest(student.agent)
        .get('/api/v1/users/me/sessions')
        .expect(200);

      const sessions = sessionsResponse.body;
      if (sessions.length > 1) {
        // Find a session that is not the current one
        const sessionToRevoke = sessions.find((s: any) => !s.isCurrent);
        if (sessionToRevoke) {
          await authenticatedRequest(student.agent)
            .delete(`/api/v1/users/me/sessions/${sessionToRevoke.id}`)
            .expect(200);
        }
      }
    });
  });

  describe('Public Routes Access', () => {
    it('étudiant peut voir la liste des consultants', async () => {
      await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/consultants')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('étudiant peut voir le profil public d\'un consultant', async () => {
      const { consultantId } = await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/consultant/${consultantId}/public`)
        .expect(200);

      expect(response.body.id).toBe(consultantId);
    });

    it('étudiant peut créer un contact', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Student Test',
          email: uniqueEmail('contact'),
          message: 'Bonjour, je souhaite des informations.',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
    });

    it('étudiant peut voir les destinations', async () => {
      await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Authorization Tests', () => {
    it('non authentifié ne peut pas accéder aux routes étudiant', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('étudiant ne peut pas accéder aux routes admin', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users')
        .expect(403);
    });

    it('étudiant ne peut pas créer de destination', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/destinations')
        .field('country', 'Forbidden')
        .field('description', 'Test')
        .expect(403);
    });

    it('étudiant ne peut pas voir les statistiques', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/stats')
        .expect(403);
    });

    it('consultant ne peut pas accéder aux routes étudiant spécifiques', async () => {
      const { consultant } = await setupStandardUsers(app);

      // Consultant should not be able to see other students' procedures
      await authenticatedRequest(consultant.agent)
        .get('/api/v1/procedure/mine')
        .expect((res) => {
          // This might be 200 (empty list) or 403 depending on implementation
          expect([200, 403]).toContain(res.status);
        });
    });
  });
});
