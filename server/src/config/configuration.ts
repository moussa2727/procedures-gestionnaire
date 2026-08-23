export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '10000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '900s',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:10000/api/v1/auth/google/callback',

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Email
  EMAIL_FROM: process.env.EMAIL_FROM,
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  // Admin
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,

  // Rate limiting
  THROTTLE_TTL: parseInt(process.env.THROTTLE_TTL || '60000', 10),
  THROTTLE_LIMIT: parseInt(process.env.THROTTLE_LIMIT || '10', 10),

  // Argon2 — hachage des mots de passe (remplace bcrypt)
  ARGON2_MEMORY_COST: parseInt(process.env.ARGON2_MEMORY_COST || '19456', 10),
  ARGON2_TIME_COST: parseInt(process.env.ARGON2_TIME_COST || '2', 10),
  ARGON2_PARALLELISM: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
});
