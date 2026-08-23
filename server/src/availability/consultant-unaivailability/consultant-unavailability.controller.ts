import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import * as currentUserInterface from '@/common/interfaces/current-user.interface';
import { ConsultantUnavailabilityService } from './consultant-unavailability.service';
import { CreateUnavailabilityDto } from './dto/create-unavailability.dto';

@ApiTags('consultant-unavailability')
@Controller('consultant-unavailability')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConsultantUnavailabilityController {
  constructor(private readonly service: ConsultantUnavailabilityService) {}

  // Consultant : gère ses propres absences.
  @Post('mine')
  @Roles(UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Déclarer une absence pour mon propre compte' })
  async createMine(
    @Body() dto: CreateUnavailabilityDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.service.create(user.id, user.role, user.id, dto);
  }

  @Get('mine')
  @Roles(UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Lister mes absences' })
  async findMine(@CurrentUser() user: currentUserInterface.CurrentUser) {
    return this.service.findForConsultant(user.id);
  }

  // Admin : gère les absences de n'importe quel consultant.
  @Post('admin/:consultantId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Déclarer une absence pour un consultant (admin)' })
  async createForConsultant(
    @Param('consultantId') consultantId: string,
    @Body() dto: CreateUnavailabilityDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.service.create(user.id, user.role, consultantId, dto);
  }

  @Get('admin/:consultantId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Lister les absences d'un consultant (admin)" })
  async findForConsultant(@Param('consultantId') consultantId: string) {
    return this.service.findForConsultant(consultantId);
  }

  @Get('range')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({
    summary: "Absences d'un consultant sur une période (lecture)",
  })
  async findInRange(
    @Query('consultantId') consultantId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.service.findForConsultantInRange(consultantId, start, end);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Supprimer une absence' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    await this.service.delete(user.id, user.role, id);
    return { success: true };
  }
}
