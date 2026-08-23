// test/e2e/destinations-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp } from '../helpers/auth.helper';
import {
  createConsultantViaAdmin,
  createDestinationWithConsultant,
  createTestImageBuffer,
  setupStandardUsers,
} from '../helpers/fixtures.helper';

const BIG_FILE = Buffer.alloc(6 * 1024 * 1024);

describe('DestinationsController (e2e) — complémentaire', () => {
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

  describe('Validation de l\'image uploadée', () => {
    it('POST /admin/destinations — valide avec une image PNG valide', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Valide-${Date.now()}`)
        .field('description', 'Destination avec image valide')
        .field('consultantIds[]', consultantId)
        .attach('image', createTestImageBuffer(), {
          filename: 'dest.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.country).toBeDefined();
    });

    it('POST /admin/destinations — rejette un type de fichier non-image', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `BadType-${Date.now()}`)
        .field('description', 'Fichier texte au lieu d\'image')
        .field('consultantIds[]', consultantId)
        .attach('image', Buffer.from('pas une image', 'utf-8'), {
          filename: 'file.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('POST /admin/destinations — rejette un fichier trop volumineux', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `TropLourd-${Date.now()}`)
        .field('description', 'Fichier image de plus de 5Mo')
        .field('consultantIds[]', consultantId)
        .attach('image', BIG_FILE, {
          filename: 'big.png',
          contentType: 'image/png',
        })
        .expect(413);
    });
  });

  describe('Recherche et liste', () => {
    it('GET /destinations/search — recherche par nom de pays', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { country } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
        'Canada',
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/search')
        .query({ q: 'Canada' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((d: any) => d.country === country)).toBe(true);
    });

    it('GET /destinations/all — liste plusieurs destinations', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      await createDestinationWithConsultant(app, admin.agent, consultantId);
      await createDestinationWithConsultant(app, admin.agent, consultantId);

      const response = await request(app.getHttpServer())
        .get('/api/v1/destinations/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cycle de vie (soft delete / restore / hard delete)', () => {
    it('DELETE /admin/destinations/:id — soft delete marque la destination comme supprimée', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      const response = await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      expect(response.body.message).toBeDefined();

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination.isDeleted).toBe(true);
      expect(destination.deletedAt).not.toBeNull();

      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(404);
    });

    it('POST /admin/destinations/:id/restore — restaure une destination désactivée', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);
      const { destinationId } = await createDestinationWithConsultant(
        app,
        admin.agent,
        consultantId,
      );

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destinationId}`)
        .expect(200);

      const restored = await authenticatedRequest(admin.agent)
        .post(`/api/v1/admin/destinations/${destinationId}/restore`)
        .expect(200);

      expect(restored.body.id).toBe(destinationId);
      expect(restored.body.isDeleted).toBe(false);

      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
      });
      expect(destination.isDeleted).toBe(false);
      expect(destination.deletedAt).toBeNull();

      await request(app.getHttpServer())
        .get(`/api/v1/destinations/${destinationId}`)
        .expect(200);
    });

    it('DELETE /admin/destinations/:id/hard — supprime définitivement', async () => {
      const { admin } = await setupStandardUsers(app);
      const destination = await prisma.destination.create({
        data: {
          country: `HardDelete-${Date.now()}`,
          description: 'Destination sans affectation, à supprimer définitivement',
          photo: '/images/placeholder.jpg',
          photoPublicId: '',
        },
      });

      const response = await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${destination.id}/hard`)
        .expect(200);

      expect(response.body.message).toBeDefined();

      const removed = await prisma.destination.findUnique({
        where: { id: destination.id },
      });
      expect(removed).toBeNull();
    });
  });

  describe('Nettoyage des images', () => {
    it('POST /admin/destinations/cleanup-images — nettoie les fichiers orphelins', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations/cleanup-images')
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(Array.isArray(response.body.deletedFiles)).toBe(true);
    });
  });
});
