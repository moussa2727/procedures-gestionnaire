// test/e2e/contacts.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import { authenticatedRequest, setTestApp, uniqueEmail } from '../helpers/auth.helper';
import { setupStandardUsers } from '../helpers/fixtures.helper';
import request from 'supertest';

describe('ContactsController (e2e)', () => {
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

  describe('POST /api/v1/contacts — public', () => {
    it('crée un message de contact', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Visiteur Test',
          email: uniqueEmail('contact'),
          message: 'Bonjour, je souhaite des informations sur vos services.',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBeDefined();
    });

    it('rejette un message trop court', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          email: uniqueEmail('short-msg'),
          message: 'court',
        })
        .expect(400);
    });
  });

  describe('Routes admin', () => {
    let contactId: string;

    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Contact Admin Test',
          email: uniqueEmail('contact-admin'),
          message: 'Message de test pour les routes admin du module contacts.',
        })
        .expect(201);

      contactId = response.body.id;
    });

    it('GET /api/v1/contacts — liste filtrée', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .expect(200);
    });

    it('GET /api/v1/contacts/statistics', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/statistics')
        .expect(200);
    });

    it('GET /api/v1/contacts/unread-count', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/unread-count')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.count).toBe('number');
        });
    });

    it('GET /api/v1/contacts/:id — détail', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/contacts/${contactId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(contactId);
        });
    });

    it('PATCH /api/v1/contacts/:id/read — marquer comme lu', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/read`)
        .expect(200);
    });

    it('PATCH /api/v1/contacts/mark-all-read', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch('/api/v1/contacts/mark-all-read')
        .expect(200);
    });

    it('PATCH /api/v1/contacts/:id/reply — répondre', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/reply`)
        .send({
          replyMessage: 'Merci pour votre message, nous revenons vers vous.',
        })
        .expect(200);
    });

    it('DELETE /api/v1/contacts/:id — supprimer', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/contacts/${contactId}`)
        .expect(204);
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/contacts')
        .expect(403);
    });
  });
});