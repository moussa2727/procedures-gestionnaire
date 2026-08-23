// test/helpers/create-test-app.ts
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import { EmailService } from '@/email/email.service';
import { SecurityHeadersMiddleware } from '@/common/middleware/security-headers.middleware';
import { XssSanitizationMiddleware } from '@/common/middleware/xss-sanitization.middleware';
import { CsrfMiddleware } from '@/common/middleware/csrf.middleware';

const mockEmailService = {
  onModuleInit: async (): Promise<void> => undefined,
  send: async (): Promise<void> => undefined,
};

const mockCloudinaryService = {
  validateFile: (): void => undefined,
  uploadFile: async () => ({
    publicId: 'test/e2e-image',
    url: 'https://example.com/test/e2e-image.jpg',
    width: 800,
    height: 600,
    format: 'jpg',
    bytes: 2048,
  }),
  getFileUrl: (publicId: string) =>
    publicId.startsWith('http')
      ? publicId
      : `https://example.com/${publicId}.jpg`,
  deleteFile: async () => true,
  cleanupOrphanedFiles: async () => [] as string[],
};

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(mockEmailService)
    .overrideProvider(CloudinaryService)
    .useValue(mockCloudinaryService)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/docs', '/favicon.ico', '/ping', '/api'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(cookieParser(process.env.COOKIE_SECRET ?? 'test-cookie-secret'));

  const securityHeaders = new SecurityHeadersMiddleware();
  const xssSanitization = new XssSanitizationMiddleware();
  const csrf = new CsrfMiddleware();

  app.use(securityHeaders.use.bind(securityHeaders));
  app.use(xssSanitization.use.bind(xssSanitization));
  app.use(csrf.use.bind(csrf));

  await app.init();
  return app;
}

// Health check test app without versioning for simpler route testing
export async function createSimpleTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(mockEmailService)
    .overrideProvider(CloudinaryService)
    .useValue(mockCloudinaryService)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser(process.env.COOKIE_SECRET ?? 'test-cookie-secret'));

  await app.init();
  return app;
}