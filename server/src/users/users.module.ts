// users/users.module.ts
import { Global, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersGateway } from './users.gateway';
import { UsersJobsModule } from './jobs/users-jobs.module';

@Global()
@Module({
  imports: [UsersJobsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersGateway],
  exports: [UsersService, UsersGateway],
})
export class UsersModule {}
