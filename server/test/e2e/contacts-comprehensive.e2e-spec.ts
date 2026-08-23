// test/e2e/contacts-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { ContactStatus } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  setTestApp,
  uniqueEmail,
} from '../helpers/auth.helper';
import { setupStandardUsers } from '../helpers/fixtures.helper';

describe('ContactsController (e2e) — complémentaire', () => {
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

  async function listContactIds() {
    const contacts = await prisma.contact.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return contacts.map((c) => c.id);
  }

  async function createContact(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/contacts')
      .send({
        name: 'Contact Comptage',
        email: uniqueEmail('contact-comp'),
        message:
          'Bonjour, je souhaite des informations sur vos services de recrutement.',
      })
      .expect(201);
  }

  describe('Détection de spam', () => {
    it('ne stocke pas un message contenant un mot-clé suspect', async () => {
      const before = await prisma.contact.count();

      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Spammer',
          email: uniqueEmail('spam'),
          message:
            'Viagra pas cher pour votre bien et votre santé. Commandez maintenant !',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      const after = await prisma.contact.count();
      expect(after).toBe(before);
    });

    it('détecte plus de 2 liens comme spam', async () => {
      const before = await prisma.contact.count();

      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Lienieur',
          email: uniqueEmail('links'),
          message:
            'Visitez https://exemple1.com et https://exemple2.com et https://exemple3.com pour plus d infos.',
        })
        .expect(201);

      const after = await prisma.contact.count();
      expect(after).toBe(before);
    });

    it('bloque les soumissions rápides en succession (rate limit)', async () => {
      const payload = {
        name: 'Rapide',
        email: uniqueEmail('rapide'),
        message:
          'Bonjour, message de test pour la limitation de débit du formulaire de contact.',
      };

      await request(app.getHttpServer()).post('/api/v1/contacts').send(payload).expect(201);
      await request(app.getHttpServer()).post('/api/v1/contacts').send({ ...payload, email: uniqueEmail('rapide') }).expect(201);
      await request(app.getHttpServer()).post('/api/v1/contacts').send({ ...payload, email: uniqueEmail('rapide') }).expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({ ...payload, email: uniqueEmail('rapide') })
        .expect(429);
    });
  });

  describe('Statistiques', () => {
    it('GET /statistics — précision des compteurs après opérations', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();
      await createContact();

      const ids = await listContactIds();
      const [contactA, contactB] = ids;

      let stats = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/statistics')
        .expect(200);

      expect(stats.body.total).toBeGreaterThanOrEqual(2);
      expect(stats.body.pending).toBeGreaterThanOrEqual(2);
      expect(stats.body.unread).toBeGreaterThanOrEqual(2);
      expect(stats.body.replied).toBe(0);
      expect(stats.body.archived).toBe(0);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactA}/reply`)
        .send({ reply: 'Merci pour votre message, nous revenons vers vous rapidement.' })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactB}/archive`)
        .expect(200);

      stats = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts/statistics')
        .expect(200);

      expect(stats.body.replied).toBeGreaterThanOrEqual(1);
      expect(stats.body.archived).toBeGreaterThanOrEqual(1);
      expect(stats.body.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Suppression en masse', () => {
    it('DELETE /contacts/bulk — soft delete plusieurs messages', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();
      await createContact();

      const ids = await listContactIds();

      const response = await authenticatedRequest(admin.agent)
        .delete('/api/v1/contacts/bulk')
        .send({ ids })
        .expect(200);

      expect(response.body.deleted).toBe(ids.length);
      expect(response.body.failed).toBe(0);

      for (const id of ids) {
        const contact = await prisma.contact.findUnique({ where: { id } });
        expect(contact!.deletedAt).not.toBeNull();
      }
    });

    it('DELETE /contacts/bulk — suppression définitive (permanent: true)', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();
      await createContact();

      const ids = await listContactIds();

      const response = await authenticatedRequest(admin.agent)
        .delete('/api/v1/contacts/bulk')
        .send({ ids, permanent: true })
        .expect(200);

      expect(response.body.deleted).toBe(ids.length);

      for (const id of ids) {
        const contact = await prisma.contact.findUnique({ where: { id } });
        expect(contact).toBeNull();
      }
    });
  });

  describe('Archivage / désarchivage', () => {
    it('PATCH /contacts/:id/archive — archive puis restaure', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();

      const [contactId] = await listContactIds();

      const archived = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/archive`)
        .expect(200);

      expect(archived.body.status).toBe(ContactStatus.ARCHIVED);

      const unarchived = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/unarchive`)
        .expect(200);

      expect(unarchived.body.status).toBe(ContactStatus.READ);
    });

    it('refuse d\'archiver un message déjà répondu', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();

      const [contactId] = await listContactIds();

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/reply`)
        .send({ reply: 'Merci pour votre message, nous revenons vers vous rapidement.' })
        .expect(200);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/archive`)
        .expect(400);
    });
  });

  describe('Réponse', () => {
    it('PATCH /contacts/:id/reply — répond au contact', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();

      const [contactId] = await listContactIds();
      const replyText =
        'Merci pour votre message, nous revenons vers vous dans les plus brefs délais.';

      const response = await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactId}/reply`)
        .send({ reply: replyText })
        .expect(200);

      expect(response.body.reply).toBe(replyText);
      expect(response.body.status).toBe(ContactStatus.REPLIED);
      expect(response.body.repliedById).toBe(admin.user.id);
    });
  });

  describe('Filtrage et recherche', () => {
    it('GET /contacts?status=NEW — filtre par statut', async () => {
      const { admin } = await setupStandardUsers(app);
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Filtrable',
          email: uniqueEmail('filtre'),
          message:
            'Un message de test pour vérifier le filtrage par statut de contact.',
        })
        .expect(201);
      await createContact();

      const [contactA] = await listContactIds();

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${contactA}/read`)
        .expect(200);

      const newResponse = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .query({ status: ContactStatus.NEW, limit: 100 })
        .expect(200);

      expect(Array.isArray(newResponse.body.items)).toBe(true);
      expect(newResponse.body.items.length).toBeGreaterThanOrEqual(1);
      expect(
        newResponse.body.items.every((c: any) => c.status === ContactStatus.NEW),
      ).toBe(true);

      const readResponse = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .query({ status: ContactStatus.READ, limit: 100 })
        .expect(200);

      expect(readResponse.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /contacts?search= — recherche par email et nom', async () => {
      const { admin } = await setupStandardUsers(app);
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Jean Banane',
          email: uniqueEmail('jean-banane'),
          message:
            'Je souhaite des informations sur les démarches administratives à l\'étranger.',
        })
        .expect(201);

      const byName = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .query({ search: 'Jean', limit: 100 })
        .expect(200);

      expect(byName.body.items.length).toBeGreaterThanOrEqual(1);

      const byEmailTerm = (
        await prisma.contact.findMany({ where: { deletedAt: null } })
      ).find((c) => c.name === 'Jean Banane');
      expect(byEmailTerm).toBeDefined();

      const byEmail = await authenticatedRequest(admin.agent)
        .get('/api/v1/contacts')
        .query({ search: byEmailTerm!.email.slice(0, 6), limit: 100 })
        .expect(200);

      expect(byEmail.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Compteur de non-lus', () => {
    it('GET /contacts/unread-count — évolue après lecture et archivage', async () => {
      const { admin } = await setupStandardUsers(app);
      await createContact();
      await createContact();

      const ids = await listContactIds();

      const initial = (
        await authenticatedRequest(admin.agent)
          .get('/api/v1/contacts/unread-count')
          .expect(200)
      ).body;

      expect(initial.count).toBeGreaterThanOrEqual(2);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${ids[0]}/reply`)
        .send({ reply: 'Merci pour votre message, nous revenons vers vous rapidement.' })
        .expect(200);

      const afterReply = (
        await authenticatedRequest(admin.agent)
          .get('/api/v1/contacts/unread-count')
          .expect(200)
      ).body.count;
      expect(afterReply).toBeLessThanOrEqual(initial.count - 1);

      await authenticatedRequest(admin.agent)
        .patch(`/api/v1/contacts/${ids[1]}/archive`)
        .expect(200);

      const afterArchive = (
        await authenticatedRequest(admin.agent)
          .get('/api/v1/contacts/unread-count')
          .expect(200)
      ).body.count;
      expect(afterArchive).toBeLessThanOrEqual(afterReply);
    });
  });
});
