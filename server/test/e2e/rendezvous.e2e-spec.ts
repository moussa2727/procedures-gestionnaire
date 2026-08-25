// test/e2e/07-rendezvous.e2e-spec.ts
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
  getNextWorkableDate,
  TimeSlot,
  Opinion,
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
      const date = getNextWorkableDate(5);

      const response = await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date,
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
      expect(response.body.consultantId).toBe(consultantId);
      expect(response.body.destinationId).toBe(destinationId);
      expect(response.body.date).toBe(date);
      expect(response.body.time).toBe(TimeSlot.SLOT_1000);
      
      // Vérifier la création en base
      const rdv = await prisma.rendezVous.findUnique({
        where: { id: response.body.id },
      });
      expect(rdv).toBeDefined();
      expect(rdv?.studentId).toBe(student.user.id);
      
      // Vérifier le booking
      const booking = await prisma.consultantBooking.findUnique({
        where: {
          consultantId_date_time: {
            consultantId,
            date: new Date(date),
            time: TimeSlot.SLOT_1000,
          },
        },
      });
      expect(booking).toBeDefined();
      expect(booking?.rendezVousId).toBe(response.body.id);
    });

    it('crée un rendez-vous avec toutes les informations', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const date = getNextWorkableDate(5);

      const response = await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date,
          time: TimeSlot.SLOT_1400,
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '0612345678',
          sector: 'Médecine',
          studyLevel: 'Doctorat',
        })
        .expect(201);

      expect(response.body.firstName).toBe('Jean');
      expect(response.body.lastName).toBe('Dupont');
      expect(response.body.email).toBe('jean.dupont@example.com');
      expect(response.body.phone).toBe('0612345678');
      expect(response.body.sector).toBe('Médecine');
      expect(response.body.studyLevel).toBe('Doctorat');
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

    it('rejette un créneau déjà pris', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const date = getNextWorkableDate(5);

      // Premier rendez-vous
      await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date,
          time: TimeSlot.SLOT_1000,
          firstName: 'Premier',
          lastName: 'Test',
          email: uniqueEmail('first'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(201);

      // Deuxième rendez-vous - même créneau
      const student2 = await createStudentSession(app, 'second');
      await authenticatedRequest(student2.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date,
          time: TimeSlot.SLOT_1000,
          firstName: 'Deuxième',
          lastName: 'Test',
          email: uniqueEmail('second'),
          phone: '0600000002',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(400);
    });

    it('rejette une date dans le passé', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: dateStr,
          time: TimeSlot.SLOT_1000,
          firstName: 'Past',
          lastName: 'Test',
          email: uniqueEmail('past'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(400);
    });

    it('rejette un week-end', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      
      let weekendDate = new Date();
      while (weekendDate.getDay() !== 6) {
        weekendDate.setDate(weekendDate.getDate() + 1);
      }
      const dateStr = weekendDate.toISOString().split('T')[0];

      await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId,
          destinationId,
          date: dateStr,
          time: TimeSlot.SLOT_1000,
          firstName: 'Weekend',
          lastName: 'Test',
          email: uniqueEmail('weekend'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(400);
    });

    it('rejette un consultant non affecté à la destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const otherConsultant = await createConsultantViaAdmin(app, admin.agent, 'other');
      const student = await createStudentSession(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/rendez-vous')
        .send({
          consultantId: otherConsultant.user.id,
          destinationId,
          date: getNextWorkableDate(5),
          time: TimeSlot.SLOT_1000,
          firstName: 'NotAssigned',
          lastName: 'Test',
          email: uniqueEmail('notassigned'),
          phone: '0600000001',
          sector: 'Informatique',
          studyLevel: 'Master',
        })
        .expect(400);
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
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(10),
        time: TimeSlot.SLOT_1400,
      });

      const response = await authenticatedRequest(student.agent)
        .get('/api/v1/rendez-vous/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('studentId');
      expect(response.body[0].studentId).toBe(student.user.id);
    });

    it('ne voit pas les rendez-vous des autres', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student1 = await createStudentSession(app, 'first');
      const student2 = await createStudentSession(app, 'second');

      await createRendezVous(app, student1.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      const response = await authenticatedRequest(student2.agent)
        .get('/api/v1/rendez-vous/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('admin ne peut pas lister les rendez-vous etudiant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/rendez-vous/mine')
        .expect(403);
    });
  });

  describe('GET /api/v1/rendez-vous/consultant/mine', () => {
    it('consultant voit ses rendez-vous', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get('/api/v1/rendez-vous/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].consultantId).toBe(consultantId);
    });

    it('ne voit pas les rendez-vous des autres consultants', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const otherConsultant = await createConsultantViaAdmin(app, admin.agent, 'other');
      const student = await createStudentSession(app);

      await createRendezVous(app, student.agent, {
        consultantId: otherConsultant.user.id,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .get('/api/v1/rendez-vous/consultant/mine')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/rendez-vous/admin/all', () => {
    it('admin voit tous les rendez-vous', async () => {
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

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/rendez-vous/admin/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('consultant ne peut pas lister tous les rendez-vous', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/rendez-vous/admin/all')
        .expect(403);
    });
  });

  describe('GET /api/v1/rendez-vous/:id', () => {
    it('etudiant voit son rendez-vous', async () => {
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

      const response = await authenticatedRequest(student.agent)
        .get(`/api/v1/rendez-vous/${rdv.id}`)
        .expect(200);

      expect(response.body.id).toBe(rdv.id);
      expect(response.body.studentId).toBe(student.user.id);
    });

    it('consultant voit son rendez-vous', async () => {
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
        .get(`/api/v1/rendez-vous/${rdv.id}`)
        .expect(200);

      expect(response.body.id).toBe(rdv.id);
      expect(response.body.consultantId).toBe(consultantId);
    });

    it('admin voit un rendez-vous', async () => {
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
        .get(`/api/v1/rendez-vous/${rdv.id}`)
        .expect(200);

      expect(response.body.id).toBe(rdv.id);
    });

    it('etudiant ne voit pas le rendez-vous d\'un autre', async () => {
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

      await authenticatedRequest(student2.agent)
        .get(`/api/v1/rendez-vous/${rdv.id}`)
        .expect(403);
    });

    it('retourne 404 pour un rendez-vous inexistant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/rendez-vous/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/reschedule', () => {
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
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      const newDate = getNextWorkableDate(15);
      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: newDate, time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(newDate);
      expect(response.body.time).toBe(TimeSlot.SLOT_1400);

      // Vérifier en base
      const updatedRdv = await prisma.rendezVous.findUnique({
        where: { id: rdv.id },
      });
      expect(updatedRdv?.date.toISOString().split('T')[0]).toBe(newDate);
      expect(updatedRdv?.time).toBe(TimeSlot.SLOT_1400);
      
      // Vérifier le booking mis à jour
      const booking = await prisma.consultantBooking.findUnique({
        where: { rendezVousId: rdv.id },
      });
      expect(booking?.date.toISOString().split('T')[0]).toBe(newDate);
      expect(booking?.time).toBe(TimeSlot.SLOT_1400);
    });

    it('admin peut replanifier un rendez-vous', async () => {
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

      const newDate = getNextWorkableDate(15);
      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: newDate, time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(newDate);
    });

    it('consultant peut replanifier un rendez-vous', async () => {
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
      const newDate = getNextWorkableDate(15);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: newDate, time: TimeSlot.SLOT_1400 })
        .expect(200);

      expect(response.body.date).toBe(newDate);
    });

    it('rejette une replanification sur un créneau déjà pris', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      
      const date = getNextWorkableDate(5);
      const rdv1 = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date,
        time: TimeSlot.SLOT_1000,
      });
      
      const student2 = await createStudentSession(app, 'second');
      const rdv2 = await createRendezVous(app, student2.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(10),
        time: TimeSlot.SLOT_1400,
      });

      // Tentative de replanification sur le créneau de rdv1
      await authenticatedRequest(student2.agent)
        .patch(`/api/v1/rendez-vous/${rdv2.id}/reschedule`)
        .send({ date, time: TimeSlot.SLOT_1000 })
        .expect(400);
    });

    it('rejette une replanification sur une date passée', async () => {
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

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: dateStr, time: TimeSlot.SLOT_1400 })
        .expect(400);
    });

    it('rejette une replanification sur le même créneau', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const date = getNextWorkableDate(5);
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date,
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date, time: TimeSlot.SLOT_1000 })
        .expect(400);
    });

    it('rejette après annulation', async () => {
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
        .send({ reason: 'Annulation' })
        .expect(200);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/reschedule`)
        .send({ date: getNextWorkableDate(15), time: TimeSlot.SLOT_1400 })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/cancel', () => {
    it('etudiant peut annuler son rendez-vous', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      const date = getNextWorkableDate(15);
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date,
        time: TimeSlot.SLOT_1000,
      });

      const response = await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulé par étudiant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.cancellationReason).toBe('Annulé par étudiant');
      expect(response.body.cancelledAt).toBeDefined();

      // Vérifier en base
      const updatedRdv = await prisma.rendezVous.findUnique({
        where: { id: rdv.id },
      });
      expect(updatedRdv?.status).toBe('CANCELLED');
    });

    it('admin peut annuler un rendez-vous', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulé par admin' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.cancellationReason).toBe('Annulé par admin');
    });

    it('consultant peut annuler un rendez-vous', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulé par consultant' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('ne permet pas d\'annuler moins de 24h avant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const student = await createStudentSession(app);
      
      // Date dans moins de 24h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: dateStr,
        time: TimeSlot.SLOT_1000,
      });

      // Modifier la date du rendez-vous pour qu'il soit dans moins de 24h
      await prisma.rendezVous.update({
        where: { id: rdv.id },
        data: { 
          date: tomorrow,
        },
      });

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Annulation tardive' })
        .expect(400);
    });

    it('rejette une annulation déjà annulée', async () => {
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
        .send({ reason: 'Annulation' })
        .expect(200);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/cancel`)
        .send({ reason: 'Double annulation' })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/complete', () => {
    it('admin peut marquer un rendez-vous comme terminé', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');

      const updatedRdv = await prisma.rendezVous.findUnique({
        where: { id: rdv.id },
      });
      expect(updatedRdv?.status).toBe('COMPLETED');
    });

    it('consultant peut marquer un rendez-vous comme terminé', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('etudiant ne peut pas marquer un rendez-vous comme terminé', async () => {
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
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(403);
    });

    it('ne permet pas de compléter un rendez-vous annulé', async () => {
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
        .send({ reason: 'Annulation' })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(400);
    });
  });

  describe('PATCH /api/v1/rendez-vous/:id/opinion', () => {
    it('consultant peut donner un avis favorable', async () => {
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

      // Compléter le rendez-vous d'abord
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(200);

      expect(response.body.opinion).toBe(Opinion.FAVORABLE);

      const updatedRdv = await prisma.rendezVous.findUnique({
        where: { id: rdv.id },
      });
      expect(updatedRdv?.opinion).toBe(Opinion.FAVORABLE);
    });

    it('consultant peut donner un avis défavorable', async () => {
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

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      const response = await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.UNFAVORABLE })
        .expect(200);

      expect(response.body.opinion).toBe(Opinion.UNFAVORABLE);
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
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/complete`)
        .expect(200);

      await authenticatedRequest(student.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(403);
    });

    it('ne permet pas d\'avis sur un rendez-vous annulé', async () => {
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
        .send({ reason: 'Annulation' })
        .expect(200);

      const consultantSession = await createConsultantViaAdmin(app, admin.agent);
      await authenticatedRequest(consultantSession.agent)
        .patch(`/api/v1/rendez-vous/${rdv.id}/opinion`)
        .send({ opinion: Opinion.FAVORABLE })
        .expect(400);
    });
  });
});