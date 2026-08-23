// test/setup/env.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const serverRoot = path.join(__dirname, '../..');
const envTestPath = path.join(serverRoot, '.env.test');
const envPath = path.join(serverRoot, '.env');

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
} else {
  dotenv.config({ path: envPath });
}

process.env.NODE_ENV = 'test';

if (!process.env.DATABASE_URL?.includes('_test')) {
  const baseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:Sangare@localhost:5432/procedures_gestionnaire';
  process.env.DATABASE_URL = baseUrl.replace(
    /\/[^/?]+(\?.*)?$/,
    '/procedures_gestionnaire_test$1',
  );
}

process.env.REDIS_URL =
  process.env.REDIS_URL?.replace(/\/\d+$/, '/15') ||
  'redis://localhost:6379/15';

process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'test-admin@e2e.local';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TestAdmin@12345678';

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-long!!';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-min-32-chars!!';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test-cookie-secret';
process.env.EMAIL_FROM =
  process.env.EMAIL_FROM || 'test@panameconsulting.local';
process.env.RESEND_API_KEY =
  process.env.RESEND_API_KEY || 're_test_fake_key_for_e2e';