// test/helpers/db.helper.ts
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

const EXCLUDED_TABLES = new Set(['_prisma_migrations']);

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;

  const tableNames = tables
    .map(({ tablename }) => tablename)
    .filter((name) => !EXCLUDED_TABLES.has(name));

  if (tableNames.length === 0) {
    return;
  }

  const quoted = tableNames.map((name) => `"public"."${name}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`,
  );
}

export async function flushRedis(redisService: RedisService): Promise<void> {
  const client = redisService.getClient();
  await client.flushdb();
}

export async function seedTestAdmin(prisma: PrismaService): Promise<void> {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;
  const hashedPassword = await argon2.hash(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Test',
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Test',
      role: UserRole.ADMIN,
      isActive: true,
      photo: '',
      photoPublicId: '',
    },
  });
}

export async function resetTestData(
  prisma: PrismaService,
  redisService: RedisService,
): Promise<void> {
  await cleanDatabase(prisma);
  await flushRedis(redisService);
  await seedTestAdmin(prisma);
}