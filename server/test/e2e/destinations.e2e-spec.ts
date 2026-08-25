// test/e2e/04-destinations.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createDestinationWithConsultant,
  createTestImageBuffer,
  setupStandardUsers,
  createConsultantViaAdmin,
} from '../helpers/fixtures.helper';

describe('DestinationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let testImage: Buffer;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    setTestApp(app);
    testImage = createTestImageBuffer();
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/destinations/all - Routes publiques', () => {
    it('liste toutes les destinations', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      await createDestinationWithConsultant(app, admin.agent, consultantId, 'France');
      await createDestinationWithConsultant(app, admin.agent, consultantId, 'Espagne');

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('country');
        expect(response.body[0]).toHaveProperty('description');
        expect(response.body[0]).toHaveProperty('photo');
        expect(response.body[0]).toHaveProperty('isDeleted');
        expect(response.body[0]).toHaveProperty('activeConsultantsCount');
      }
    });

    it('utilise le cache Redis', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      await createDestinationWithConsultant(app, admin.agent, consultantId, 'Cache');

      // Vider le cache
      await redisService.getClient().del('destinations:all');

      // Première requête - remplit le cache
      await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);

      // Vérifier que le cache est rempli
      const cached = await redisService.getClient().get('destinations:all');
      expect(cached).toBeDefined();

      // Deuxième requête - utilise le cache
      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('ne liste pas les destinations supprimées', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'ToDelete',
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);

      expect(response.body.some((d: any) => d.id === destinationId)).toBe(false);
    });
  });

  describe('GET /api/v1/destinations/search', () => {
    it('recherche par pays', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { country } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Canada',
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/search')
        .query({ q: country.slice(0, 6) })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      if (response.body.length > 0) {
        expect(response.body[0].country).toContain(country.slice(0, 6));
      }
    });

    it('recherche insensible à la casse', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      await createDestinationWithConsultant(app, admin.agent, consultantId, 'FRANCE');

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/search')
        .query({ q: 'france' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('retourne une liste vide pour une recherche sans résultat', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/search')
        .query({ q: 'inexistant' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('retourne une liste vide pour une requête vide', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/search')
        .query({ q: '' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/destinations/:id', () => {
    it('récupère une destination par ID', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Detail',
      );

      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(destinationId);
          expect(res.body.country).toBeDefined();
          expect(res.body.description).toBeDefined();
          expect(res.body.photo).toBeDefined();
          expect(res.body.isDeleted).toBe(false);
        });
    });

    it('utilise le cache Redis', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'CacheDetail',
      );

      // Vider le cache
      await redisService.getClient().del(`destination:${destinationId}`);

      // Première requête - remplit le cache
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);

      // Vérifier que le cache est rempli
      const cached = await redisService.getClient().get(`destination:${destinationId}`);
      expect(cached).toBeDefined();

      // Deuxième requête - utilise le cache
      const response = await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);

      expect(response.body.id).toBe(destinationId);
    });

    it('retourne 404 pour une destination inexistante', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/destinations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('retourne 404 pour une destination supprimée', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Deleted',
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/admin/destinations - Routes admin', () => {
    it('crée une destination avec photo', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Allemagne-${Date.now()}`)
        .field('description', 'Destination test e2e Allemagne')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'dest.png')
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.country).toBeDefined();
      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();

      // Vérifier en base
      const destination = await prisma.destination.findUnique({
        where: { id: response.body.id },
      });
      expect(destination).toBeDefined();
      expect(destination?.photoPublicId).toBeDefined();
    });

    it('crée une destination avec plusieurs consultants', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const consultant2 = await createConsultantViaAdmin(app, admin.agent, 'multi');

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Multi-${Date.now()}`)
        .field('description', 'Destination avec plusieurs consultants')
        .field('consultantIds', [consultantId, consultant2.user.id])
        .attach('image', testImage, 'multi.png')
        .expect(201);

      const assignments = await prisma.consultantDestination.findMany({
        where: { destinationId: response.body.id },
      });
      expect(assignments.length).toBe(2);
    });

    it('rejette sans image', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `SansImage-${Date.now()}`)
        .field('description', 'Sans image')
        .field('consultantIds', [consultantId])
        .expect(400);
    });

    it('rejette sans consultant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `SansConsultant-${Date.now()}`)
        .field('description', 'Sans consultant')
        .attach('image', testImage, 'no-consultant.png')
        .expect(400);
    });

    it('rejette un pays déjà existant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const country = `Duplicate-${Date.now()}`;

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', country)
        .field('description', 'Première destination')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'first.png')
        .expect(201);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', country)
        .field('description', 'Deuxième destination')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'second.png')
        .expect(409);
    });

    it('rejette un consultant inexistant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Inexistant-${Date.now()}`)
        .field('description', 'Consultant inexistant')
        .field('consultantIds', ['00000000-0000-0000-0000-000000000000'])
        .attach('image', testImage, 'inexistant.png')
        .expect(400);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Interdit-${Date.now()}`)
        .field('description', 'Test interdit')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'interdit.png')
        .expect(403);
    });
  });

  describe('GET /api/v1/admin/destinations/:id', () => {
    it('récupère une destination en admin', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'AdminDetail',
      );

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(destinationId);
          expect(res.body.country).toBeDefined();
          expect(res.body.description).toBeDefined();
          expect(res.body.photo).toBeDefined();
          expect(res.body.isDeleted).toBe(false);
        });
    });

    it('retourne 404 pour une destination inexistante', async () => {
      const { admin } = await setupStandardUsers(app);
      await authenticatedRequest(admin.agent)
        .get('/api/v1/admin/destinations/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PUT /api/v1/admin/destinations/:id', () => {
    it('met à jour une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Update',
      );

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/admin/destinations/${destinationId}`)
        .field('description', 'Description mise à jour via e2e')
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Description mise à jour via e2e');
        });

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination?.description).toBe('Description mise à jour via e2e');
    });

    it('met à jour le pays', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'OldCountry',
      );

      const newCountry = `NewCountry-${Date.now()}`;
      await authenticatedRequest(admin.agent)
        .put(`/api/v1/admin/destinations/${destinationId}`)
        .field('country', newCountry)
        .expect(200)
        .expect((res) => {
          expect(res.body.country).toBe(newCountry);
        });

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination?.country).toBe(newCountry);
    });

    it('met à jour la photo', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'PhotoUpdate',
      );

      const oldPhoto = (await prisma.destination.findUnique({ where: { id: destinationId } }))?.photo;

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/admin/destinations/${destinationId}`)
        .attach('image', testImage, 'new-photo.png')
        .expect(200)
        .expect((res) => {
          expect(res.body.photo).not.toBe(oldPhoto);
        });
    });

    it('rejette un pays déjà existant', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId: dest1 } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Country1',
      );
      const { destinationId: dest2 } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Country2',
      );

      const dest1Data = await prisma.destination.findUnique({ where: { id: dest1 } });

      await authenticatedRequest(admin.agent)
        .put(`/api/v1/admin/destinations/${dest2}`)
        .field('country', dest1Data!.country)
        .expect(409);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student, admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'NoAccess',
      );

      await authenticatedRequest(student.agent)
        .put(`/api/v1/admin/destinations/${destinationId}`)
        .field('description', 'Hack')
        .expect(403);
    });
  });

  describe('DELETE /api/v1/admin/destinations/:id', () => {
    it('soft delete une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'ToDelete',
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Destination désactivée avec succès');
        });

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination?.isDeleted).toBe(true);
      expect(destination?.deletedAt).toBeDefined();
    });

    it('empêche la suppression avec des procédures actives', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'WithProcedure',
      );

      // Créer un rendez-vous pour créer une procédure
      const student = await createStudentSession(app);
      const rdv = await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });
      await createProcedureFromRendezVous(app, admin.agent, rdv.id);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('procédure(s) en cours');
        });
    });

    it('empêche la suppression avec des rendez-vous actifs', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'WithRdv',
      );

      const student = await createStudentSession(app);
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('rendez-vous actif(s)');
        });
    });

    it('invalide le cache après suppression', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'CacheDelete',
      );

      // Remplir le cache
      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      // Vérifier que le cache est invalidé
      const cached = await redisService.getClient().get(`destination:${destinationId}`);
      expect(cached).toBeNull();

      const allCached = await redisService.getClient().get('destinations:all');
      expect(allCached).toBeNull();
    });
  });

  describe('POST /api/v1/admin/destinations/:id/restore', () => {
    it('restaure une destination supprimée', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'ToRestore',
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/destinations/${destinationId}/restore`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isDeleted).toBe(false);
        });

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination?.isDeleted).toBe(false);
      expect(destination?.deletedAt).toBeNull();
    });

    it('empêche la restauration sans consultant actif', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'NoConsultant',
      );

      // Supprimer le consultant
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/users/${consultantId}`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/destinations/${destinationId}/restore`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('sans consultant actif');
        });
    });
  });

  describe('DELETE /api/v1/admin/destinations/:id/hard', () => {
    it('supprime définitivement une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'HardDelete',
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}/hard`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Destination supprimée définitivement avec succès');
        });

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination).toBeNull();
    });

    it('empêche la suppression avec des dépendances', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'WithDeps',
      );

      // Créer un rendez-vous lié
      const student = await createStudentSession(app);
      await createRendezVous(app, student.agent, {
        consultantId,
        destinationId,
        date: getNextWorkableDate(5),
        time: TimeSlot.SLOT_1000,
      });

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}/hard`)
        .expect(400);
    });
  });

  describe('POST /api/v1/admin/destinations/cleanup-images', () => {
    it('nettoie les images orphelines', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations/cleanup-images')
        .expect(200);

      expect(response.body.deletedFiles).toBeDefined();
      expect(Array.isArray(response.body.deletedFiles)).toBe(true);
    });
  });
});