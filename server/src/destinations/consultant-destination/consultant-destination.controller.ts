import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import * as currentUserInterface from '@/common/interfaces/current-user.interface';
import { UserRole } from '@prisma/client';
import { ConsultantDestinationService } from './consultant-destination.service';
import { AssignConsultantDto } from './dto/assign-consultant.dto';
import { AvailabilityService } from '@/availability/availability.service';

@ApiTags('consultant-destinations')
@Controller('admin/consultant-destinations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ConsultantDestinationController {
  constructor(
    private readonly service: ConsultantDestinationService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Post(':destinationId')
  @ApiOperation({ summary: 'Affecter un consultant à une destination' })
  async assign(
    @Param('destinationId') destinationId: string,
    @Body() dto: AssignConsultantDto,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
  ) {
    await this.service.assignConsultant(
      destinationId,
      dto.consultantId,
      admin.id,
    );
    await this.availabilityService.invalidateConsultantCache(destinationId);
    return { success: true };
  }

  @Delete(':destinationId/:consultantId')
  @ApiOperation({ summary: 'Retirer une affectation consultant/destination' })
  async remove(
    @Param('destinationId') destinationId: string,
    @Param('consultantId') consultantId: string,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
  ) {
    await this.service.removeAssignment(destinationId, consultantId, admin.id);
    await this.availabilityService.invalidateConsultantCache(destinationId);
    return { success: true };
  }

  @Get('destination/:destinationId')
  @ApiOperation({
    summary: 'Lister les consultants affectés à une destination',
  })
  async listByDestination(@Param('destinationId') destinationId: string) {
    return this.service.listByDestination(destinationId);
  }

  @Get('consultant/:consultantId')
  @ApiOperation({ summary: "Lister les destinations d'un consultant" })
  async listByConsultant(@Param('consultantId') consultantId: string) {
    return this.service.listByConsultant(consultantId);
  }
}
