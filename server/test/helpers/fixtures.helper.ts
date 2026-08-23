// test/helpers/fixtures.helper.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TimeSlot, UserRole, StepStatus, ProcedureStatus, RendezvousStatus, Opinion } from '@prisma/client';
import {
  AuthSession,
  authenticatedRequest,
  loginAs,
  registerStudent,
  uniqueEmail,
} from './auth.helper';

const TEST_PASSWORD = 'TestUser@12345678';

export interface TestUsers {
  admin: AuthSession;
  consultant: AuthSession;
  student: AuthSession;
  consultantId: string;
  studentId: string;
}

export function getNextWorkableDate(daysAhead = 21): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split('T')[0];
}

export function createTestImageBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

async function getCsrfToken(app: INestApplication): Promise<{ csrfToken: string; cookies: string[] }> {
  const response = await request(app.getHttpServer())
    .get('/api/v1/csrf-token')
    .expect(200);

  const csrfToken = response.body.csrfToken;
  const cookies = response.headers['set-cookie'] as unknown as string[];

  return { csrfToken, cookies };
}

export async function createConsultantViaAdmin(
  app: INestApplication,
  adminAgent: any,
  suffix = 'consultant',
): Promise<AuthSession> {
  const email = uniqueEmail(suffix);

  const { csrfToken, cookies } = await getCsrfToken(app);

  const createResponse = await authenticatedRequest(adminAgent)
    .post('/api/v1/users')
    .set('x-csrf-token', csrfToken)
    .set('Cookie', cookies)
    .send({
      email,
      password: TEST_PASSWORD,
      firstName: 'Consultant',
      lastName: 'Test',
      role: UserRole.CONSULTANT,
      isActive: true,
    })
    .expect(201);

  const login = await loginAs(app, email, TEST_PASSWORD);
  return {
    ...login,
    user: { ...login.user, id: createResponse.body.id },
  };
}

export async function createStudentSession(
  app: INestApplication,
  suffix = 'student',
): Promise<AuthSession> {
  const email = uniqueEmail(suffix);
  const user = await registerStudent(app, {
    email,
    password: TEST_PASSWORD,
    firstName: 'Etudiant',
    lastName: 'Test',
    phone: '0600000000',
  });

  const login = await loginAs(app, email, TEST_PASSWORD);
  return {
    ...login,
    user: { ...login.user, id: user.id },
  };
}

export async function createDestinationWithConsultant(
  app: INestApplication,
  adminAgent: any,
  consultantId: string,
  countrySuffix = 'France',
): Promise<{ destinationId: string; country: string }> {
  const country = `${countrySuffix}-${Date.now()}`;

  const { csrfToken, cookies } = await getCsrfToken(app);

  // Build the request with multipart form data
  const req = authenticatedRequest(adminAgent)
    .post('/api/v1/admin/destinations')
    .set('x-csrf-token', csrfToken)
    .set('Cookie', cookies)
    .field('country', country)
    .field('description', 'Destination de test e2e')
    .field('consultantIds[]', consultantId);

  const response = await req
    .attach('image', createTestImageBuffer(), {
      filename: 'test-destination.png',
      contentType: 'image/png',
    });

  expect(response.status).toBe(201);

  return { destinationId: response.body.id, country };
}

export async function setupStandardUsers(
  app: INestApplication,
): Promise<TestUsers> {
  const admin = await loginAs(
    app,
    process.env.ADMIN_EMAIL!,
    process.env.ADMIN_PASSWORD!,
  );

  const consultant = await createConsultantViaAdmin(app, admin.agent);
  const student = await createStudentSession(app);

  return {
    admin,
    consultant,
    student,
    consultantId: consultant.user.id,
    studentId: student.user.id,
  };
}

export async function createRendezVous(
  app: INestApplication,
  studentAgent: any,
  payload: {
    consultantId: string;
    destinationId: string;
    date?: string;
    time?: TimeSlot;
  },
): Promise<{ id: string; body: Record<string, unknown> }> {
  const { csrfToken, cookies } = await getCsrfToken(app);

  const response = await authenticatedRequest(studentAgent)
    .post('/api/v1/rendez-vous')
    .set('x-csrf-token', csrfToken)
    .set('Cookie', cookies)
    .send({
      consultantId: payload.consultantId,
      destinationId: payload.destinationId,
      date: payload.date ?? getNextWorkableDate(),
      time: payload.time ?? TimeSlot.SLOT_1000,
      firstName: 'Etudiant',
      lastName: 'Test',
      email: uniqueEmail('rdv'),
      phone: '0600000001',
      sector: 'Informatique',
      studyLevel: 'Master',
    })
    .expect(201);

  return { id: response.body.id, body: response.body };
}

export async function createProcedureFromRendezVous(
  app: INestApplication,
  userAgent: any,
  rendezVousId: string,
  stepNames: string[] = ['Dossier', 'Visa', 'Billet'],
): Promise<{ id: string; numeroDossier: string; body: Record<string, unknown> }> {
  const { csrfToken, cookies } = await getCsrfToken(app);

  const response = await authenticatedRequest(userAgent)
    .post('/api/v1/procedure')
    .set('x-csrf-token', csrfToken)
    .set('Cookie', cookies)
    .send({
      rendezVousId,
      stepNames,
    })
    .expect(201);

  return { id: response.body.id, numeroDossier: response.body.numeroDossier, body: response.body };
}

export async function createFollowUpMeeting(
  app: INestApplication,
  userAgent: any,
  procedureId: string,
  payload: {
    date?: string;
    time?: TimeSlot;
    reason?: string;
  } = {},
): Promise<{ id: string; body: Record<string, unknown> }> {
  const { csrfToken, cookies } = await getCsrfToken(app);

  const response = await authenticatedRequest(userAgent)
    .post('/api/v1/follow-up-meeting')
    .set('x-csrf-token', csrfToken)
    .set('Cookie', cookies)
    .send({
      procedureId,
      date: payload.date ?? getNextWorkableDate(10),
      time: payload.time ?? TimeSlot.SLOT_1000,
      reason: payload.reason ?? 'Suivi de procédure',
    })
    .expect(201);

  return { id: response.body.id, body: response.body };
}

export { TEST_PASSWORD, StepStatus, ProcedureStatus, RendezvousStatus, Opinion, TimeSlot };