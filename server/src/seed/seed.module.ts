// src/seed/seed.module.ts
import { Module, Global } from '@nestjs/common';
import { SeedService } from './seed.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
