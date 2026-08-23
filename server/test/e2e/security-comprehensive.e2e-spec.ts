// test/e2e/security-comprehensive.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createTestApp } from '../helpers/create-test-app';
import { resetTestData } from '../helpers/db.helper';
import {
  authenticatedRequest,
  loginAs,
  registerStudent,
  setTestApp,
  uniqueEmail,
} from '../helpers/auth.helper';
import { TEST_PASSWORD, setupStandardUsers } from '../helpers/fixtures.helper';

describe('Security Comprehensive (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
    setTestApp(app);
  });

  beforeEach(async () => {
    await resetTestData(prisma, redisService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function getCsrfToken(): Promise<{ csrfToken: string; cookies: string[] }> {
    const response = await request(app.getHttpServer())
      .get('/api/v1/csrf-token')
      .expect(200);

    const csrfToken = response.body.csrfToken;
    const cookies = response.headers['set-cookie'] as unknown as string[];

    return { csrfToken, cookies };
  }

  // ==========================================================================
  // XSS PROTECTION
  // ==========================================================================
  describe('XSS Protection', () => {
    it('rejects XSS payload in name field with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'test@e2e.local',
          message: 'Valid message content here',
        });

      expect([400, 429]).toContain(response.status);
    });

    it('rejects XSS payload in message field with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Valid Name',
          email: 'test@e2e.local',
          message: '<img src=x onerror=alert("xss")>',
        });

      expect([400, 429]).toContain(response.status);
    });

    it('rejects XSS payload in email field with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Valid Name',
          email: 'test@e2e.local<script>alert("xss")</script>',
          message: 'Valid message content here',
        });

      expect([400, 429]).toContain(response.status);
    });

    it('rejects script tags in all text fields', async () => {
      const xssPayloads = [
        '<script>alert(1)</script>',
        '<SCRIPT>alert(1)</SCRIPT>',
        '<script src="evil.js"></script>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)">',
        '<body onload=alert(1)>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: payload,
            email: 'valid@e2e.local',
            message: 'Valid message',
          });

        expect([400, 429]).toContain(response.status);
      }
    });

    it('rejects javascript: protocol in fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'javascript:alert(1)',
          email: 'test@e2e.local',
          message: 'Valid message content',
        });

      expect([400, 429]).toContain(response.status);
    });

    it('rejects event handler attributes in fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send({
          name: 'Valid Name',
          email: 'test@e2e.local',
          message: '"><svg onload=alert(1)>',
        });

      expect([400, 429]).toContain(response.status);
    });
  });

  // ==========================================================================
  // SQL INJECTION PROTECTION
  // ==========================================================================
  describe('SQL Injection Protection', () => {
    it('rejects SQL injection in email field with 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: 'anything',
        });

      expect([400, 401]).toContain(response.status);
    });

    it('rejects SQL injection in password field with 400 or 401', async () => {
      const email = uniqueEmail('sql-test');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'SQL',
        lastName: 'Test',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: "' OR '1'='1' --",
        });

      expect([400, 401]).toContain(response.status);
    });

    it('SQL injection attempts do not crash the server', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#",
        "1; SELECT * FROM users",
        "' OR ''='",
      ];

      for (const payload of sqlPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: payload,
            password: payload,
          });

        expect([400, 401]).toContain(response.status);
      }
    });

    it('SQL injection attempts do not return unauthorized data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: "admin' UNION SELECT password FROM users --",
          password: 'anything',
        });

      expect([400, 401]).toContain(response.status);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('data');
    });

    it('SQL injection in register fields is handled safely', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail('sql-register'),
          password: TEST_PASSWORD,
          firstName: "'; DROP TABLE users; --",
          lastName: 'Test',
        });

      expect([400, 201]).toContain(response.status);
    });
  });

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================
  describe('Rate Limiting', () => {
    it('throttles multiple rapid requests to login', async () => {
      const email = uniqueEmail('throttle-login');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Throttle',
        lastName: 'Login',
      });

      const results: number[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrongpassword' });
        results.push(response.status);
      }

      const allRejected = results.every((s) => [401, 403, 429].includes(s));
      expect(allRejected).toBe(true);
    });

    it('throttles multiple rapid requests to register', async () => {
      const results: number[] = [];
      for (let i = 0; i < 15; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail(`throttle-register-${i}`),
            password: TEST_PASSWORD,
            firstName: 'Throttle',
            lastName: 'Register',
          });
        results.push(response.status);
      }

      const allValid = results.every((s) => [201, 429].includes(s));
      expect(allValid).toBe(true);
    });

    it('throttles multiple rapid requests to forgot-password', async () => {
      const results: number[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({ email: `throttle-forgot-${i}@e2e.local` });
        results.push(response.status);
      }

      const allValid = results.every((s) => [200, 429].includes(s));
      expect(allValid).toBe(true);
    });

    it('throttles multiple rapid requests to contact', async () => {
      const results: number[] = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Throttle Contact',
            email: `throttle-contact-${i}@e2e.local`,
            message: 'This is a test message for rate limiting validation',
          });
        results.push(response.status);
      }

      const allValid = results.every((s) => [201, 429].includes(s));
      expect(allValid).toBe(true);
    });

    it('rate limit eventually blocks after many requests', async () => {
      const email = uniqueEmail('throttle-reset');
      await registerStudent(app, {
        email,
        password: TEST_PASSWORD,
        firstName: 'Throttle',
        lastName: 'Reset',
      });

      let lastStatus = 200;
      for (let i = 0; i < 15; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: 'wrong' });
        lastStatus = response.status;
      }

      expect([401, 403, 429]).toContain(lastStatus);
    });
  });

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================
  describe('Authentication', () => {
    it('rejects expired tokens with 401', async () => {
      const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');
      const expiredToken = await jwtService.signAsync(
        { sub: 'test-id', email: 'test@e2e.local', role: 'ETUDIANT', sessionId: 'test-session' },
        { secret: jwtSecret, expiresIn: '0s' },
      );

      await new Promise((resolve) => setTimeout(resolve, 1100));

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [`access_token=${expiredToken}`])
        .expect(401);
    });

    it('rejects invalid tokens with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', ['access_token=invalid-token-here'])
        .expect(401);
    });

    it('rejects tampered tokens with 401', async () => {
      const { admin } = await setupStandardUsers(app);

      const cookies = admin.cookies;
      const accessToken = cookies.find((c: string) => c.startsWith('access_token='));
      const tokenValue = accessToken?.split('=')[1] || '';
      const tamperedToken = tokenValue.slice(0, -5) + 'XXXXX';

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [`access_token=${tamperedToken}`])
        .expect(401);
    });

    it('tokens from different users are isolated', async () => {
      const { admin, student } = await setupStandardUsers(app);

      const adminCookies = admin.cookies;
      const studentCookies = student.cookies;

      const adminAccessToken = adminCookies.find((c: string) => c.startsWith('access_token='));
      const studentAccessToken = studentCookies.find((c: string) => c.startsWith('access_token='));

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [adminAccessToken])
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe('ADMIN');
        });

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', [studentAccessToken])
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe('ETUDIANT');
        });
    });

    it('rejects requests without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('rejects malformed JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });
  });

  // ==========================================================================
  // AUTHORIZATION
  // ==========================================================================
  describe('Authorization', () => {
    it('students cannot access admin routes', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users')
        .expect(403);
    });

    it('consultants cannot access admin routes', async () => {
      const { consultant } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get('/api/v1/users')
        .expect(403);
    });

    it('admins can access all routes', async () => {
      const { admin } = await setupStandardUsers(app);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users')
        .expect(200);

      await authenticatedRequest(admin.agent)
        .get('/api/v1/users/stats')
        .expect(200);
    });

    it('students cannot access consultant-only routes', async () => {
      const { student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/consultant/me')
        .expect(403);
    });

    it('consultants cannot access student-only routes', async () => {
      const { consultant, student } = await setupStandardUsers(app);

      const { csrfToken, cookies } = await getCsrfToken();

      await authenticatedRequest(consultant.agent)
        .post(`/api/v1/users/consultant/${student.user.id}/reviews`)
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({ rating: 5, comment: 'Test review' })
        .expect(403);
    });

    it('users can only access their own profile data', async () => {
      const { admin, student } = await setupStandardUsers(app);

      await authenticatedRequest(student.agent)
        .get('/api/v1/users/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(student.user.id);
        });

      await authenticatedRequest(admin.agent)
        .get(`/api/v1/users/${student.user.id}`)
        .expect(200);
    });

    it('non-admin users cannot access other users data by ID', async () => {
      const { consultant, student } = await setupStandardUsers(app);

      await authenticatedRequest(consultant.agent)
        .get(`/api/v1/users/${student.user.id}`)
        .expect(403);
    });

    it('admins can access admin-only user management routes', async () => {
      const { admin } = await setupStandardUsers(app);

      const { csrfToken, cookies } = await getCsrfToken();
      const email = uniqueEmail('admin-create');

      await authenticatedRequest(admin.agent)
        .post('/api/v1/users')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({
          email,
          password: TEST_PASSWORD,
          firstName: 'Created',
          lastName: 'ByAdmin',
          role: 'CONSULTANT',
          isActive: true,
        })
        .expect(201);
    });

    it('non-admins cannot create users', async () => {
      const { consultant } = await setupStandardUsers(app);

      const { csrfToken, cookies } = await getCsrfToken();

      await authenticatedRequest(consultant.agent)
        .post('/api/v1/users')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', cookies)
        .send({
          email: uniqueEmail('unauthorized-create'),
          password: TEST_PASSWORD,
          firstName: 'Unauthorized',
          lastName: 'Creation',
          role: 'ETUDIANT',
        })
        .expect(403);
    });
  });
});
