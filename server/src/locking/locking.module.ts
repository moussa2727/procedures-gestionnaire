// locking/locking.module.ts
import { Global, Module } from '@nestjs/common';
import { LockingService } from './locking.service';
import { RedisModule } from '@/redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [LockingService],
  exports: [LockingService],
})
export class LockingModule {}
