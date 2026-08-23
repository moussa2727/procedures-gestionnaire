import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DestinationService } from './destinations.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationResponseDto } from './dto/destination-response.dto';
import { multerConfig } from '@/config/multer.config';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import * as currentUserInterface from '@/common/interfaces/current-user.interface';

@ApiTags('destinations')
@Controller('')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  // ==================== ROUTES PUBLIQUES ====================

  @Get('destinations/all')
  @Public()
  @ApiOperation({ summary: 'Récupérer toutes les destinations' })
  @ApiResponse({ status: 200, type: [DestinationResponseDto] })
  async findAll(): Promise<DestinationResponseDto[]> {
    return this.destinationService.findAll();
  }

  @Get('destinations/search')
  @Public()
  @ApiOperation({ summary: 'Rechercher une destination par pays' })
  @ApiResponse({ status: 200, type: [DestinationResponseDto] })
  async search(@Query('q') query: string): Promise<DestinationResponseDto[]> {
    return this.destinationService.searchByCountry(query);
  }

  @Get('destinations/:id')
  @Public()
  @ApiOperation({ summary: 'Récupérer une destination par ID' })
  @ApiResponse({ status: 200, type: DestinationResponseDto })
  async findOnePublic(
    @Param('id') id: string,
  ): Promise<DestinationResponseDto> {
    return this.destinationService.findOne(id);
  }

  // ==================== ROUTES ADMIN ====================

  @Post('admin/destinations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateDestinationDto })
  @ApiOperation({
    summary:
      'Créer une destination — la photo est obligatoirement un fichier uploadé',
  })
  @ApiResponse({ status: 201, type: DestinationResponseDto })
  async create(
    @Body() createDto: CreateDestinationDto,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DestinationResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'Une image doit être fournie (fichier uploadé, aucune URL acceptée)',
      );
    }
    return this.destinationService.create(createDto, file, admin.id);
  }

  @Get('admin/destinations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une destination par ID (Admin)' })
  @ApiResponse({ status: 200, type: DestinationResponseDto })
  async findOne(@Param('id') id: string): Promise<DestinationResponseDto> {
    return this.destinationService.findOne(id);
  }

  @Put('admin/destinations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mettre à jour une destination' })
  @ApiResponse({ status: 200, type: DestinationResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDestinationDto,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DestinationResponseDto> {
    return this.destinationService.update(id, updateDto, file, admin.id);
  }

  @Delete('admin/destinations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Désactiver une destination (soft delete)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
  ): Promise<{ message: string }> {
    await this.destinationService.remove(id, admin.id);
    return { message: 'Destination désactivée avec succès' };
  }

  @Post('admin/destinations/:id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restaurer une destination désactivée' })
  @ApiResponse({ status: 200, type: DestinationResponseDto })
  async restore(
    @Param('id') id: string,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
  ): Promise<DestinationResponseDto> {
    return this.destinationService.restore(id, admin.id);
  }

  @Delete('admin/destinations/:id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer définitivement une destination' })
  async hardDelete(
    @Param('id') id: string,
    @CurrentUser() admin: currentUserInterface.CurrentUser,
  ): Promise<{ message: string }> {
    await this.destinationService.hardDelete(id, admin.id);
    return { message: 'Destination supprimée définitivement avec succès' };
  }

  @Post('admin/destinations/cleanup-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nettoyer les fichiers orphelins Cloudinary' })
  async cleanupImages(
    @CurrentUser() admin: currentUserInterface.CurrentUser,
  ): Promise<{ message: string; deletedFiles: string[] }> {
    const deletedFiles = await this.destinationService.cleanupOrphanedImages(
      admin.id,
    );
    return {
      message: `${deletedFiles.length} fichiers orphelins supprimés`,
      deletedFiles,
    };
  }
}
