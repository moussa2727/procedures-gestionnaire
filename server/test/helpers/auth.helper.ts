// test/helpers/auth.helper.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthSession {
  cookies: string[];
  user: AuthUser;
  agent: any;
}

let testApp: INestApplication | null = null;

export function setTestApp(app: INestApplication): void {
  testApp = app;
}

export function getTestApp(): INestApplication {
  if (!testApp) {
    throw new Error('Test app not initialized. Call setTestApp() in beforeAll.');
  }
  return testApp;
}

function normalizeCookies(setCookie: string | string[] | undefined): string[] {
  if (!setCookie) return [];
  const raw = Array.isArray(setCookie) ? setCookie : [setCookie];
  return raw.map((cookie) => cookie.split(';')[0]);
}

export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<AuthSession> {
  const agent = request.agent(app.getHttpServer());

  const response = await agent
    .post('/api/v1/auth/login')
    .set('x-public', 'true')
    .send({ email, password })
    .expect(200);

  return {
    cookies: normalizeCookies(response.headers['set-cookie']),
    user: response.body,
    agent,
  };
}

export async function registerStudent(
  app: INestApplication,
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  },
): Promise<AuthUser> {
  const agent = request.agent(app.getHttpServer());

  const response = await agent
    .post('/api/v1/auth/register')
    .set('x-public', 'true')
    .send(data)
    .expect(201);

  return response.body;
}

export function authenticatedRequest(agent: any): any {
  return agent;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}