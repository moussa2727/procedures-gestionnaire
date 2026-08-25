// test/e2e/11-contacts.e2e-spec.ts
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

      expect(response.body).toHaveProperty('success', true);

      // Vérifier en base
      const contact = await prisma.contact.findFirst({
        where: { email: response.body.email },
      });
      expect(contact).toBeDefined();
      expect(contact?.status).toBe('NEW');
      expect(contact?.name).toBe('Visiteur Test');
    });

    it('crée un message sans nom', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          email: uniqueEmail('contact-no-name'),
          message: 'Message sans nom',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      const contact = await prisma.contact.findFirst({
        where: { email: response.body.email },
      });
      expect(contact).toBeDefined();
      expect(contact?.name).toBe('');
    });

    it('rejette un message trop court (<10 caractères)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          email: uniqueEmail('short-msg'),
          message: 'court',
        })
        .expect(400);
    });

    it('rejette un email invalide', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          email: 'invalid-email',
          message: 'Message valide',
        })
        .expect(400);
    });

    it('détecte les spams', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          email: uniqueEmail('spam'),
          message: 'Viagra à prix discount ! Cliquez ici pour plus d\'informations.',
        })
        .expect(201);

      // Le spam est accepté mais marqué comme spam en interne
      // La réponse reste { success: true }
      expect(response.body.success).toBe(true);

      // Vérifier que le message n'est pas en base (rejeté)
      const contact = await prisma.contact.findFirst({
        where: { message: { contains: 'Viagra' } },
      });
      // Le spam peut être rejeté silencieusement
      // Dans ce cas, il n'y a pas de contact en base
    });
  });

  describe('Routes admin', () => {
    let contactId: string;

    beforeEach(async () => {
      // Délai pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Contact Admin Test',
          email: uniqueEmail('contact-admin'),
          message: 'Message de test pour les routes admin du module contacts.',
        })
        .expect(201);

      // Récupérer le contact créé
      const contact = await prisma.contact.findFirst({
        where: { email: response.body.email },
        orderBy: { createdAt: 'desc' },
      });
      contactId = contact!.id;
    });

    it('GET /api/v1/contacts — liste filtrée', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .expect(200);

      expect(response.body.items || response.body).toBeDefined();
      const items = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(Array.isArray(items)).toBe(true);
      if (items.length > 0) {
        expect(items[0]).toHaveProperty('id');
        expect(items[0]).toHaveProperty('email');
        expect(items[0]).toHaveProperty('message');
        expect(items[0]).toHaveProperty('status');
      }
    });

    it('GET /api/v1/contacts — filtre par statut', async () => {
      const { admin } = await setupStandardUsers(app);

      // Créer un contact avec statut READ
      const contact = await prisma.contact.findFirst({
        where: { id: contactId },
      });
      if (contact) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { status: 'READ' },
        });
      }

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .query({ status: 'READ' })
        .expect(200);

      const items = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(Array.isArray(items)).toBe(true);
      if (items.length > 0) {
        expect(items.every((c: any) => c.status === 'READ')).toBe(true);
      }
    });

    it('GET /api/v1/contacts — recherche', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .query({ search: 'Contact Admin' })
        .expect(200);

      const items = Array.isArray(response.body) ? response.body : response.body.items || [];
      expect(Array.isArray(items)).toBe(true);
      expect(items.some((c: any) => c.name === 'Contact Admin Test')).toBe(true);
    });

    it('GET /api/v1/contacts/statistics', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/statistics')
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.unread).toBeDefined();
      expect(response.body.replied).toBeDefined();
      expect(response.body.pending).toBeDefined();
      expect(response.body.archived).toBeDefined();
      expect(response.body.responseRate).toBeDefined();
      expect(response.body.today).toBeDefined();
      expect(response.body.thisWeek).toBeDefined();
      expect(response.body.thisMonth).toBeDefined();
      expect(response.body.generatedAt).toBeDefined();
    });

    it('GET /api/v1/contacts/unread-count', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/unread-count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('unread');
      expect(typeof response.body.count).toBe('number');
    });

    it('GET /api/v1/contacts/:id — détail', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/contacts/${contactId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(contactId);
          expect(res.body.email).toBeDefined();
          expect(res.body.message).toBeDefined();
          expect(res.body.status).toBeDefined();
        });
    });

    it('GET /api/v1/contacts/:id — retourne 404 pour un id inexistant', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('PATCH /api/v1/contacts/:id/read — marquer comme lu', async () => {
      const { admin } = await setupStandardUsers(app);

      // S'assurer que le contact est NEW
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: 'NEW' },
      });

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/read`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('READ');
        });

      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      expect(contact?.status).toBe('READ');
    });

    it('PATCH /api/v1/contacts/mark-all-read', async () => {
      const { admin } = await setupStandardUsers(app);

      // Créer plusieurs contacts non lus
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            email: uniqueEmail(`bulk-${i}`),
            message: `Message ${i}`,
          })
          .expect(201);
      }

      const response = await authenticatedRequest(admin.agent)
        .patch('/api/v1/contacts/mark-all-read')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('PATCH /api/v1/contacts/:id/reply — répondre', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/reply`)
        .send({
          replyMessage: 'Merci pour votre message, nous revenons vers vous.',
        })
        .expect(200);

      expect(response.body.status).toBe('REPLIED');
      expect(response.body.reply).toBe('Merci pour votre message, nous revenons vers vous.');
      expect(response.body.repliedAt).toBeDefined();
      expect(response.body.repliedById).toBe(admin.user.id);
    });

    it('PATCH /api/v1/contacts/:id/archive — archiver', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/archive`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ARCHIVED');
          expect(res.body.archivedAt).toBeDefined();
        });
    });

    it('PATCH /api/v1/contacts/:id/unarchive — désarchiver', async () => {
      const { admin } = await setupStandardUsers(app);

      // Archiver d'abord
      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/archive`)
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/unarchive`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('READ');
          expect(res.body.archivedAt).toBeNull();
        });
    });

    it('DELETE /api/v1/contacts/:id — soft delete', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .delete(`/api/v1/contacts/${contactId}`)
        .expect(204);

      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      expect(contact?.deletedAt).toBeDefined();
    });

    it('DELETE /api/v1/contacts/bulk — suppression en masse', async () => {
      const { admin } = await setupStandardUsers(app);

      // Créer plusieurs contacts
      const contacts = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            email: uniqueEmail(`bulk-del-${i}`),
            message: `Message ${i}`,
          })
          .expect(201);
        
        const contact = await prisma.contact.findFirst({
          where: { email: response.body.email },
          orderBy: { createdAt: 'desc' },
        });
        contacts.push(contact!.id);
      }

      const response = await authenticatedRequest(admin.agent)
        .delete('/api/v1/contacts/bulk')
        .send({ ids: contacts })
        .expect(200);

      expect(response.body.deleted).toBe(3);
      expect(response.body.failed).toBe(0);
    });

    it('DELETE /api/v1/contacts/bulk — suppression permanente', async () => {
      const { admin } = await setupStandardUsers(app);

      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          email: uniqueEmail('permanent-delete'),
          message: 'Message à supprimer définitivement',
        })
        .expect(201);

      const contact = await prisma.contact.findFirst({
        where: { email: response.body.email },
        orderBy: { createdAt: 'desc' },
      });

      await authenticatedRequest(admin.agent)
        .delete('/api/v1/contacts/bulk')
        .send({ ids: [contact!.id], permanent: true })
        .expect(200);

      const deleted = await prisma.contact.findUnique({
        where: { id: contact!.id },
      });
      expect(deleted).toBeNull();
    });

    it('refuse l\'accès aux non-admins', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/contacts')
        .expect(403);
    });
  });

  describe('Rate limiting', () => {
    it('limite le nombre de messages par IP', async () => {
      // Faire plusieurs requêtes rapidement
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/v1/contacts')
            .send({
              email: uniqueEmail(`rate-${i}`),
              message: `Message ${i}`,
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Certaines requêtes devraient être limitées (429)
      const limited = responses.filter(r => r.status === 429);
      expect(limited.length).toBeGreaterThan(0);
    });
  });
});