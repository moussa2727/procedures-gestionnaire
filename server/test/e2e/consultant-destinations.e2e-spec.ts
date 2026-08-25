// test/e2e/03-consultant-destinations.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createDestinationWithConsultant,
  setupStandardUsers,
  createConsultantViaAdmin,
} from '../helpers/fixtures.helper';

describe('ConsultantDestinationController (e2e)', () => {
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

  describe('POST /api/v1/admin/consultant-destinations/:destinationId', () => {
    it('affecte un consultant à une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Vérifier l'affectation en base
      const assignment = await prisma.consultantDestination.findUnique({
        where: {
          consultantId_destinationId: { consultantId, destinationId },
        },
      });
      expect(assignment).toBeDefined();
    });

    it('affecte plusieurs consultants à une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const consultant2 = await createConsultantViaAdmin(app, admin.agent, 'second');

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId: consultant2.user.id })
        .expect(201);

      const assignments = await prisma.consultantDestination.findMany({
        where: { destinationId },
      });
      expect(assignments.length).toBe(2);
    });

    it('ne crée pas de doublon', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      // Première affectation
      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId })
        .expect(201);

      // Deuxième affectation (doublon)
      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId })
        .expect(201);

      const assignments = await prisma.consultantDestination.findMany({
        where: { destinationId },
      });
      expect(assignments.length).toBe(1);
    });

    it('rejette un consultant inexistant', async () => {
      const { admin } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        (await createConsultantViaAdmin(app, admin.agent)).user.id,
      );

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('rejette une destination inexistante', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/consultant-destinations/00000000-0000-0000-0000-000000000000')
        .send({ consultantId })
        .expect(404);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        (await setupStandardUsers(app)).admin.agent,
        consultantId,
      );

      await authenticatedRequest(student.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/admin/consultant-destinations/:destinationId/:consultantId', () => {
    it('retire une affectation', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/consultant-destinations/${destinationId}/${consultantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      const assignment = await prisma.consultantDestination.findUnique({
        where: {
          consultantId_destinationId: { consultantId, destinationId },
        },
      });
      expect(assignment).toBeNull();
    });

    it('ne permet pas de retirer le dernier consultant d\'une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      // Supprimer l'affectation (dernier consultant)
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/consultant-destinations/${destinationId}/${consultantId}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('dernier consultant');
        });

      // Vérifier que l'affectation existe toujours
      const assignment = await prisma.consultantDestination.findUnique({
        where: {
          consultantId_destinationId: { consultantId, destinationId },
        },
      });
      expect(assignment).toBeDefined();
    });

    it('rejette une affectation inexistante', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultant.user.id,
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/consultant-destinations/${destinationId}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/consultant-destinations/destination/:destinationId', () => {
    it('liste les consultants affectés à une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );
      const consultant2 = await createConsultantViaAdmin(app, admin.agent, 'second');

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId: consultant2.user.id })
        .expect(201);

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/admin/consultant-destinations/destination/${destinationId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('consultantId');
        expect(response.body[0]).toHaveProperty('destinationId');
        expect(response.body[0]).toHaveProperty('assignedAt');
        expect(response.body[0]).toHaveProperty('consultant');
        expect(response.body[0].consultant).toHaveProperty('id');
        expect(response.body[0].consultant).toHaveProperty('email');
        expect(response.body[0].consultant).toHaveProperty('firstName');
        expect(response.body[0].consultant).toHaveProperty('lastName');
        expect(response.body[0].consultant).toHaveProperty('isActive');
      }
    });

    it('retourne une liste vide pour une destination sans consultants', async () => {
      const { admin } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        (await createConsultantViaAdmin(app, admin.agent)).user.id,
      );

      // Supprimer l'affectation
      const assignment = await prisma.consultantDestination.findFirst({
        where: { destinationId },
      });
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/consultant-destinations/${destinationId}/${assignment!.consultantId}`)
        .expect(400); // Ne peut pas supprimer le dernier

      // Créer une autre destination sans consultant
      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/admin/consultant-destinations/destination/${destinationId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/consultant-destinations/consultant/:consultantId', () => {
    it('liste les destinations d\'un consultant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      await createDestinationWithConsultant(app, admin.agent, consultantId, 'France');
      await createDestinationWithConsultant(app, admin.agent, consultantId, 'Espagne');

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/admin/consultant-destinations/consultant/${consultantId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('destination');
        expect(response.body[0].destination).toHaveProperty('id');
        expect(response.body[0].destination).toHaveProperty('country');
        expect(response.body[0].destination).toHaveProperty('photo');
      }
    });

    it('retourne une liste vide pour un consultant sans destinations', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent, 'no-dest');

      const response = await authenticatedRequest(admin.agent)
        .get(`/api/v1/admin/consultant-destinations/consultant/${consultant.user.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('Invalidation du cache', () => {
    it('invalide le cache après affectation', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      // Vider le cache
      await redisService.getClient().flushdb();

      // Faire une requête pour remplir le cache
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);

      // Ajouter un consultant
      const consultant2 = await createConsultantViaAdmin(app, admin.agent, 'cache');
      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/consultant-destinations/${destinationId}`)
        .send({ consultantId: consultant2.user.id })
        .expect(201);

      // Vérifier que le cache est invalidé
      const cached = await redisService.getClient().get(`destination:${destinationId}`);
      expect(cached).toBeNull();
    });
  });
});