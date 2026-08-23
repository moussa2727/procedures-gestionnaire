// test/e2e/rendezvous.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp, uniqueEmail } from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createStudentSession,
  createRendezVous,
  createDestinationWithConsultant,
  setupStandardUsers,
  TimeSlot,
  Opinion,
  getNextWorkableDate,
} from '../helpers/fixtures.helper';

describe('RendezVousController (e2e)', () => {
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

  describe('POST /api/v1/rendez-vous — créer un rendez-vous', () => {
    it('etudiant peut créer un rendez-vous', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
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
          firstName: 'Etudiant',
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

    it('admin ne peut pas créer un rendez-vous', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: getNextWorkableDate(5),
          time: TimeSlot.SLOT_1000,
          firstName: 'Admin',
          lastName: 'Test',
          email: uniqueEmail('admin-rdv'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(403);
    });

    it('consultant ne peut pas créer un rendez-vous', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: getNextWorkableDate(5),
          time: TimeSlot.SLOT_1000,
          firstName: 'Consultant',
          lastName: 'Test',
          email: uniqueEmail('consultant-rdv'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/rendez-vous/mine — lister mes rendez-vous', () => {
    it('etudiant voit ses rendez-vous', async () => {
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
      });

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/rendez-vous/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/rendez-vous/:id — détail rendez-vous', () => {
    it('etudiant peut voir son rendez-vous', async () => {
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
      });

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/rendez-vous/${rdv.id}`)
        .expect(200);

      expect(response.body.id).toBe(rdv.id);
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/reschedule — replanifier', () => {
    it('etudiant peut replanifier son rendez-vous', async () => {
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
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: getNextWorkableDate(10), time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(getNextWorkableDate(10));
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/cancel — annuler', () => {
    it('etudiant peut annuler son rendez-vous', async () => {
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
        date: getNextWorkableDate(15),
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulé par étudiant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/opinion — donner un avis consultant', () => {
    it('consultant peut donner un avis sur un rendez-vous', async () => {
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
      });

      // Use the original consultant's session (the one assigned to the rendez-vous)
      const response = await authenticatedRequest(consultant.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(200);

      expect(response.body.opinion).toBe(Opinion.FAVORABLE);
    });

    it('etudiant ne peut pas donner un avis consultant', async () => {
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
      });

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(403);
    });
  });
});