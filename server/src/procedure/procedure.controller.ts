// procedure/procedure.controller.ts
import {
  Body,
  Controller,
  Delete,
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
import type { CurrentUser as CurrentUserType } from '@/common/interfaces/current-user.interface';
import { ProcedureService } from './procedure.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CancelProcedureDto } from './dto/cancel-procedure.dto';
import { RejectProcedureDto } from './dto/reject-procedure.dto';
import { ProcedureResponseDto } from './dto/procedure-response.dto';
import { ProcedureDeviceContext } from './interfaces/procedure.interfaces';

@ApiTags('procedure')
@Controller('procedure')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProcedureController {
  constructor(private readonly procedureService: ProcedureService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: "Ouvrir une procédure à partir d'un rendez-vous" })
  async create(
    @Body() dto: CreateProcedureDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.create(
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Get('mine')
  @Roles(UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Lister mes procédures (étudiant)' })
  async findMine(
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto[]> {
    return this.procedureService.findAllForStudent(user.id);
  }

  @Get('consultant/mine')
  @Roles(UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Lister mes procédures (consultant)' })
  async findMineAsConsultant(
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto[]> {
    return this.procedureService.findAllForConsultant(user.id);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lister toutes les procédures (admin)' })
  async findAll(): Promise<ProcedureResponseDto[]> {
    return this.procedureService.findAllForAdmin();
  }

  @Get('dossier/:numeroDossier')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Récupérer une procédure par numéro de dossier' })
  async findByNumeroDossier(
    @Param('numeroDossier') numeroDossier: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.findByNumeroDossier(
      numeroDossier,
      user.id,
      user.role,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Récupérer une procédure par ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.findOne(id, user.id, user.role);
  }

  @Patch(':id/steps/:stepId')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({
    summary:
      "Mettre à jour le statut d'une étape (le rejet entraîne l'annulation en cascade des étapes précédentes non terminées)",
  })
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.updateStep(
      id,
      stepId,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({
    summary:
      'Clôturer une procédure (toutes les étapes doivent être terminées)',
  })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.complete(
      id,
      user.id,
      user.role,
      this.extractContext(req),
    );
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Rejeter une procédure' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectProcedureDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.reject(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Annuler une procédure (étudiant ou admin)' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelProcedureDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.cancel(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Post(':id/comments')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Ajouter un commentaire à la procédure' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<ProcedureResponseDto> {
    return this.procedureService.addComment(
      id,
      user.id,
      user.role,
      dto,
      this.extractContext(req),
    );
  }

  @Delete(':id/comments/:commentId')
  @Roles(UserRole.ADMIN, UserRole.CONSULTANT, UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Supprimer un commentaire' })
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    await this.procedureService.deleteComment(
      id,
      commentId,
      user.id,
      user.role,
      this.extractContext(req),
    );
    return { success: true };
  }

  private extractContext(req: Request): ProcedureDeviceContext {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }
}
