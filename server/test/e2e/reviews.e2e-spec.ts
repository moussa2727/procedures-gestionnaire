// test/e2e/reviews.e2e-spec.ts
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

  it('POST /api/v1/users/consultant/:id/reviews - créer un avis après rendez-vous terminé', async () => {
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
      .expect(201)
      .expect((res) => {
        expect(res.body.rating).toBe(5);
        expect(res.body.comment).toBe('Excellent consultant !');
        expect(res.body.studentId).toBe(student.user.id);
        expect(res.body.consultantId).toBe(consultantId);
      });
  });

  it('ne permet pas d\'évaluer sans rendez-vous terminé', async () => {
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
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toContain('Vous ne pouvez évaluer ce consultant');
      });
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

  it('un commentaire est obligatoire pour une note de 2 ou moins', async () => {
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
        rating: 2,
      })
      .expect(400)
      .expect((res) => {
        // Check for validation error messages (English from class-validator)
        const message = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
        expect(message.toLowerCase()).toContain('comment');
      });
  });
});