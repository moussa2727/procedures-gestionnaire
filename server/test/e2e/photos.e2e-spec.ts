// test/e2e/12-photos.e2e-spec.ts
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
} from '../helpers/auth.helper';
import {
  setupStandardUsers,
  createConsultantViaAdmin,
  createTestImageBuffer,
} from '../helpers/fixtures.helper';

describe('Photo Management (e2e)', () => {
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

  describe('PUT /api/v1/users/me/photo — upload photo de profil', () => {
    it('étudiant upload sa photo de profil', async () => {
      const { student } = await setupStandardUsers(app);

      const response = await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'profile.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();

      // Vérifier en base
      const user = await prisma.user.findUnique({
        where: { id: student.user.id },
      });
      expect(user?.photo).toBeDefined();
      expect(user?.photoPublicId).toBeDefined();
    });

    it('consultant upload sa photo de profil', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'consultant.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
    });

    it('admin upload sa photo de profil', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'admin.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
    });

    it('remplace une photo existante', async () => {
      const { student } = await setupStandardUsers(app);

      // Premier upload
      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'first.jpg')
        .expect(200);

      const userBefore = await prisma.user.findUnique({
        where: { id: student.user.id },
      });
      const oldPhoto = userBefore?.photo;

      // Deuxième upload
      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'second.jpg')
        .expect(200);

      const userAfter = await prisma.user.findUnique({
        where: { id: student.user.id },
      });
      expect(userAfter?.photo).not.toBe(oldPhoto);
    });

    it('rejette les fichiers non-image', async () => {
      const { student } = await setupStandardUsers(app);
      const nonImageBuffer = Buffer.from('not an image', 'utf-8');

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', nonImageBuffer, 'file.txt')
        .expect(400);
    });

    it('rejette les fichiers trop volumineux', async () => {
      const { student } = await setupStandardUsers(app);
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024);

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', largeBuffer, 'large.jpg')
        .expect(400);
    });

    it('retourne 401 sans authentification', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'profile.jpg')
        .expect(401);
    });
  });

  describe('PUT /api/v1/users/consultant/photo — upload photo consultant', () => {
    it('consultant upload sa photo', async () => {
      const { admin } = await setupStandardUsers(app);
      const consultant = await createConsultantViaAdmin(app, admin.agent);

      const response = await authenticatedRequest(consultant.agent)
        .put('/api/v1/users/consultant/photo')
        .attach('photo', testImage, 'consultant.jpg')
        .expect(200);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();
    });

    it('admin ne peut pas uploader la photo d\'un consultant via cette route', async () => {
      const { admin } = await setupStandardUsers(app);

      // Admin n'a pas le rôle CONSULTANT, donc 403
      await authenticatedRequest(admin.agent)
        .put('/api/v1/users/consultant/photo')
        .attach('photo', testImage, 'admin.jpg')
        .expect(403);
    });

    it('étudiant ne peut pas uploader la photo consultant', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .put('/api/v1/users/consultant/photo')
        .attach('photo', testImage, 'student.jpg')
        .expect(403);
    });
  });

  describe('POST /api/v1/admin/destinations — upload photo de destination', () => {
    it('admin upload une photo pour une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `PhotoTest-${Date.now()}`)
        .field('description', 'Test photo destination')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'destination.jpg')
        .expect(201);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photoPublicId).toBeDefined();

      const destination = await prisma.destination.findUnique({
        where: { id: response.body.id },
      });
      expect(destination?.photo).toBeDefined();
      expect(destination?.photoPublicId).toBeDefined();
    });

    it('rejette sans image', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `NoImage-${Date.now()}`)
        .field('description', 'Sans image')
        .field('consultantIds', [consultantId])
        .expect(400);
    });
  });

  describe('PUT /api/v1/admin/destinations/:id — mise à jour photo', () => {
    it('admin met à jour la photo d\'une destination', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      // Créer une destination avec photo
      const createResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `UpdatePhoto-${Date.now()}`)
        .field('description', 'Test update photo')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'first.jpg')
        .expect(201);

      const destinationId = createResponse.body.id;
      const oldPhoto = createResponse.body.photo;

      // Mettre à jour la photo
      const response = await authenticatedRequest(admin.agent)
        .put(`/api/v1/admin/destinations/${destinationId}`)
        .attach('image', testImage, 'second.jpg')
        .expect(200);

      expect(response.body.photo).not.toBe(oldPhoto);
    });
  });

  describe('DELETE /api/v1/users/me/photo — suppression photo', () => {
    it('étudiant supprime sa photo', async () => {
      const { student } = await setupStandardUsers(app);

      // Uploader une photo d'abord
      await authenticatedRequest(student.agent)
        .put('/api/v1/users/me/photo')
        .attach('photo', testImage, 'profile.jpg')
        .expect(200);

      const response = await authenticatedRequest(student.agent)
        .delete('/api/v1/users/me/photo')
        .expect(200);

      expect(response.body.photo).toBe('');
      expect(response.body.photoPublicId).toBe('');

      const user = await prisma.user.findUnique({
        where: { id: student.user.id },
      });
      expect(user?.photo).toBe('');
      expect(user?.photoPublicId).toBe('');
    });

    it('retourne 200 même sans photo', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .delete('/api/v1/users/me/photo')
        .expect(200);
    });
  });

  describe('POST /api/v1/admin/destinations/cleanup-images', () => {
    it('nettoie les images orphelines', async () => {
      const { admin, consultantId } = await setupStandardUsers(app);

      // Créer une destination avec photo
      const createResponse = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations')
        .field('country', `Cleanup-${Date.now()}`)
        .field('description', 'Test cleanup')
        .field('consultantIds', [consultantId])
        .attach('image', testImage, 'cleanup.jpg')
        .expect(201);

      // Supprimer la destination (soft delete)
      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/admin/destinations/${createResponse.body.id}`)
        .expect(200);

      // Nettoyer les images orphelines
      const response = await authenticatedRequest(admin.agent)
        .post('/api/v1/admin/destinations/cleanup-images')
        .expect(200);

      expect(response.body.deletedFiles).toBeDefined();
      expect(Array.isArray(response.body.deletedFiles)).toBe(true);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .post('/api/v1/admin/destinations/cleanup-images')
        .expect(403);
    });
  });
});