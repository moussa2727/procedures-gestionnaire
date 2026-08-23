import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import * as currentUserInterface from '@/common/interfaces/current-user.interface';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== ADMIN ====================

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStatistics() {
    return this.usersService.getStatistics();
  }

  @Get('role/:role')
  @Roles(UserRole.ADMIN)
  async findByRole(@Param('role') role: UserRole) {
    return this.usersService.findByRole(role);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.create(dto, user.id);
  }

  @Post('admin/logout-all-users')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async logoutAllUsers(
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Req() req: Request,
  ) {
    return this.usersService.logoutAllUsers(user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('reviews/:reviewId/moderate')
  @Roles(UserRole.ADMIN)
  async moderateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.moderateReviewComment(reviewId, user.id, dto);
  }

  // ==================== PROFIL PERSONNEL (tous rôles) ====================

  @Get('me')
  async getProfile(@CurrentUser() user: currentUserInterface.CurrentUser) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me')
  async updateProfile(
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async updateMyPhoto(
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updatePhoto(user.id, file);
  }

  // ==================== SESSIONS ACTIVES ====================
  //
  // README : max 2 sessions simultanées, refusées au-delà — ces endpoints
  // permettent à l'utilisateur de gérer lui-même ses connexions actives.

  @Get('me/sessions')
  async listMySessions(@CurrentUser() user: currentUserInterface.CurrentUser) {
    return this.usersService.listMySessions(user.id, user.sessionId);
  }

  @Delete('me/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeMySession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    await this.usersService.revokeMySession(user.id, sessionId, user.sessionId);
    return { message: 'Session révoquée avec succès' };
  }

  // ==================== CONSULTANT ====================

  @Get('consultants')
  @Public()
  async listConsultantsSemiPublic() {
    return this.usersService.listConsultantsSemiPublic();
  }

  @Get('consultant/me')
  @Roles(UserRole.CONSULTANT)
  async getConsultantProfile(
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.getConsultantProfile(user.id);
  }

  @Put('consultant/photo')
  @Roles(UserRole.CONSULTANT)
  @UseInterceptors(FileInterceptor('photo'))
  async updateConsultantPhoto(
    @CurrentUser() user: currentUserInterface.CurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updatePhoto(user.id, file);
  }

  @Get('consultant/:id/public')
  @Public()
  async getConsultantPublicProfile(@Param('id') id: string) {
    return this.usersService.getConsultantPublicProfile(id);
  }

  @Get('consultant/:id/students')
  @Roles(UserRole.CONSULTANT, UserRole.ADMIN)
  async getConsultantStudents(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    if (user.role !== UserRole.ADMIN && user.id !== id) {
      throw new ForbiddenException(
        'Vous ne pouvez voir que vos propres étudiants',
      );
    }
    return this.usersService.getConsultantStudents(id);
  }

  // ==================== EVALUATIONS (étudiant) ====================

  @Post('consultant/:id/reviews')
  @Roles(UserRole.ETUDIANT)
  async createReview(
    @Param('id') consultantId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.createReview(user.id, consultantId, dto);
  }

  @Post('reviews/:reviewId/response')
  @Roles(UserRole.CONSULTANT)
  async respondToReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: RespondReviewDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.respondToReview(user.id, reviewId, dto);
  }

  // ==================== ADMIN ROUTES WITH :id (after static routes) ====================

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneWithDetails(id);
  }

  @Get(':id/login-history')
  @Roles(UserRole.ADMIN)
  async getLoginHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getLoginHistory(id, page, limit);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.update(id, dto, user.id);
  }

  @Patch(':id/promote-to-consultant')
  @Roles(UserRole.ADMIN)
  async promoteToConsultant(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.promoteToConsultant(id, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.toggleStatus(id, isActive, user.id);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    return this.usersService.restore(id, user.id);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    await this.usersService.resetUserPassword(id, newPassword, user.id);
    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    await this.usersService.remove(id, user.id);
    return { message: 'Utilisateur supprimé avec succès' };
  }

  @Delete(':id/sessions/:sessionId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminRevokeSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: currentUserInterface.CurrentUser,
  ) {
    await this.usersService.adminRevokeUserSession(id, sessionId, user.id);
    return { message: 'Session révoquée avec succès' };
  }
}
