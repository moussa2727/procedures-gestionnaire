// procedure/procedure.module.ts
import { Module } from '@nestjs/common';
import { ProcedureController } from './procedure.controller';
import { ProcedureService } from './procedure.service';
import { ProcedureGateway } from './procedure.gateway';

@Module({
  imports: [],
  controllers: [ProcedureController],
  providers: [ProcedureService, ProcedureGateway],
  exports: [ProcedureService],
})
export class ProcedureModule {}
