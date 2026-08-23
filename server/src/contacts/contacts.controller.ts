// modules/contacts/contacts.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { FilterContactDto } from './dto/filter-contact.dto';
import { ReplyContactDto } from './dto/reply-contact.dto';
import { BulkOperationDto } from './dto/bulk-operation.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@UseGuards(ThrottlerGuard)
@SkipThrottle({ public: true })
@Controller('contacts')
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(private readonly contactsService: ContactsService) {}

  @SkipThrottle({ public: false })
  @Throttle({ public: { limit: 3, ttl: 60000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateContactDto, @Ip() ip: string) {
    this.logger.log('Nouveau message de contact recu');
    return this.contactsService.create(dto, ip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() filter: FilterContactDto) {
    this.logger.log('Liste des contacts demandee par un admin');
    return this.contactsService.findAll(filter);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('statistics')
  getStatistics() {
    this.logger.log('Statistiques demandees par un admin');
    return this.contactsService.getStatistics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('unread-count')
  getUnreadCount() {
    this.logger.log('Nombre de messages non lus demande par un admin');
    return this.contactsService.getUnreadCount();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`Consultation du message ${id} par un admin`);
    return this.contactsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    this.logger.log(`Message ${id} marque comme lu par un admin`);
    return this.contactsService.markAsRead(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser() user: { id: string }) {
    this.logger.log('Tous les messages marques comme lus par un admin');
    return this.contactsService.markAllAsRead(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyContactDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Reponse au message ${id} par un admin`);
    return this.contactsService.reply(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    this.logger.log(`Message ${id} archive par un admin`);
    return this.contactsService.archive(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    this.logger.log(`Message ${id} desarchive par un admin`);
    return this.contactsService.unarchive(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  bulkDelete(
    @Body() dto: BulkOperationDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(
      `Suppression en masse de ${dto.ids.length} messages par un admin`,
    );
    return this.contactsService.bulkDelete(dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    this.logger.log(`Suppression du message ${id} par un admin`);
    return this.contactsService.remove(id, user.id);
  }
}
