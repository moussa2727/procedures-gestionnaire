// follow-up-meeting/follow-up-meeting.controller.ts
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
import { FollowUpMeetingService } from './follow-up-meeting.service';
import { CreateFollowUpMeetingDto } from './dto/create-follow-up-meeting.dto';
import { RescheduleFollowUpMeetingDto } from './dto/reschedule-follow-up-meeting.dto';
import { CancelFollowUpMeetingDto } from './dto/cancel-follow-up-meeting.dto';
import { FollowUpMeetingResponseDto } from './dto/follow-up-meeting-response.dto';
import { FollowUpMeetingDeviceContext } from './interfaces/follow-up-meeting.interfaces';

@ApiTags('follow-up-meeting')
@Controller('follow-up-meeting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FollowUpMeetingController {
  constructor(private readonly service: FollowUpMeetingService) {}

  @Post()
  @Roles(UserRole.ETUDIANT, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Créer un rendez-vous de suivi pour une procédure' })
  async create(
    @Body() dto: CreateFollowUpMeetingDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<FollowUpMeetingResponseDto> {
    return this.service.create(
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Get('procedure/:procedureId')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: "Lister les rendez-vous de suivi d'une procédure" })
  async findAllForProcedure(
    @Param('procedureId') procedureId: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<FollowUpMeetingResponseDto[]> {
    return this.service.findAllForProcedure(procedureId, user.id, user.role);
  }

  @Get('mine')
  @Roles(UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Lister mes rendez-vous de suivi (étudiant)' })
  async findMine(
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<FollowUpMeetingResponseDto[]> {
    return this.service.findAllForStudent(user.id);
  }

  @Get('consultant/mine')
  @Roles(UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Lister mes rendez-vous de suivi (consultant)' })
  async findMineAsConsultant(
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<FollowUpMeetingResponseDto[]> {
    return this.service.findAllForConsultant(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Récupérer un rendez-vous de suivi par ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ): Promise<FollowUpMeetingResponseDto> {
    return this.service.findOne(id, user.id, user.role);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Replanifier un rendez-vous de suivi' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleFollowUpMeetingDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<FollowUpMeetingResponseDto> {
    return this.service.reschedule(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Annuler un rendez-vous de suivi' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelFollowUpMeetingDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<FollowUpMeetingResponseDto> {
    return this.service.cancel(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Marquer un rendez-vous de suivi comme terminé' })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ): Promise<FollowUpMeetingResponseDto> {
    return this.service.complete(
      id,
      user.id,
      user.role,
      this.extractContext(req),
    );
  }

  private extractContext(req: Request): FollowUpMeetingDeviceContext {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }
}
