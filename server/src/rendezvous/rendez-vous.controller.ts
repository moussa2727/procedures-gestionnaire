import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import * as currentUserInterface from '@/common/interfaces/current-user.interface';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { RescheduleRendezVousDto } from './dto/reschedule-rendez-vous.dto';
import { CancelRendezVousDto } from './dto/cancel-rendez-vous.dto';
import { SetOpinionDto } from './dto/set-opinion.dto';
import { RendezVousResponseDto } from './dto/rendez-vous-response.dto';
import { RendezVousDeviceContext } from './interfaces/rendez-vous.interfaces';

@ApiTags('rendez-vous')
@Controller('rendez-vous')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RendezVousController {
  constructor(private readonly rendezVousService: RendezVousService) {}

  @Post()
  @Roles(UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Créer un rendez-vous informatif' })
  async create(
    @Body() dto: CreateRendezVousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<RendezVousResponseDto> {
    return this.rendezVousService.create(
      user.id,
      dto,
      this.extractContext(req),
    );
  }

  @Get('mine')
  @Roles(UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Lister mes rendez-vous (étudiant)' })
  async findMine(
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<RendezVousResponseDto[]> {
    return this.rendezVousService.findAllForStudent(user.id);
  }

  @Get('consultant/mine')
  @Roles(UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Lister mes rendez-vous (consultant)' })
  async findMineAsConsultant(
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<RendezVousResponseDto[]> {
    return this.rendezVousService.findAllForConsultant(user.id);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lister tous les rendez-vous (admin)' })
  async findAll(): Promise<RendezVousResponseDto[]> {
    return this.rendezVousService.findAllForAdmin();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Récupérer un rendez-vous par ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<RendezVousResponseDto> {
    return this.rendezVousService.findOne(id, user.id, user.role);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Replanifier un rendez-vous' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleRendezVousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<RendezVousResponseDto> {
    return this.rendezVousService.reschedule(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelRendezVousDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<RendezVousResponseDto> {
    return this.rendezVousService.cancel(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Marquer un rendez-vous comme terminé' })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<RendezVousResponseDto> {
    return this.rendezVousService.complete(
      id,
      user.id,
      user.role,
      this.extractContext(req),
    );
  }

  @Patch(':id/opinion')
  @Roles(UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Donner un avis consultant sur le rendez-vous' })
  async setOpinion(
    @Param('id') id: string,
    @Body() dto: SetOpinionDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<RendezVousResponseDto> {
    return this.rendezVousService.setOpinion(
      id,
      user.id,
      dto,
      this.extractContext(req),
    );
  }

  private extractContext(req: Request): RendezVousDeviceContext {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
