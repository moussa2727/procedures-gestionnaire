// availability/availability.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { UserRole, TimeSlot } from '@prisma/client';
import { AvailabilityService } from './availability.service';

// Controller entièrement en lecture seule — aucune méthode ici n'écrit
// jamais en base ni n'acquiert de verrou logique. C'est une façade HTTP
// sur des calculs déjà exécutés en interne par AvailabilityService ;
// aucune route ne peut donc violer le cycle obligatoire de réservation
// (lock -> validation -> transaction -> booking), qui reste exclusivement
// dans RendezVousService/FollowUpMeetingService.
@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Vue calendrier d'une seule journée pour une destination — utilisée
  // pour la navigation initiale (avant que l'utilisateur ait choisi un
  // consultant précis). Publique : la navigation de disponibilité doit
  // être possible avant connexion, exactement comme le catalogue
  // destinations.
  @Get('day')
  @Public()
  @ApiOperation({
    summary:
      "Disponibilité d'une journée pour une destination (et un consultant optionnel)",
  })
  async getDayAvailability(
    @Query('destinationId') destinationId: string,
    @Query('date') date: string,
    @Query('consultantId') consultantId?: string,
  ) {
    if (!destinationId || !date) {
      throw new BadRequestException('destinationId et date sont requis');
    }
    return this.availabilityService.getDayAvailability(
      destinationId,
      this.parseDate(date),
      consultantId,
    );
  }

  // Vue calendrier sur une période — alimente un calendrier mensuel côté
  // frontend sans multiplier les appels /day.
  @Get('range')
  @Public()
  @ApiOperation({
    summary: 'Disponibilité sur une période pour une destination',
  })
  async getAvailabilityRange(
    @Query('destinationId') destinationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('consultantId') consultantId?: string,
  ) {
    if (!destinationId || !startDate || !endDate) {
      throw new BadRequestException(
        'destinationId, startDate et endDate sont requis',
      );
    }
    return this.availabilityService.getAvailabilityRange(
      destinationId,
      this.parseDate(startDate),
      this.parseDate(endDate),
      consultantId,
    );
  }

  // Liste des créneaux libres pour un consultant précis sur une journée —
  // dernière étape avant soumission d'un RendezVous ou FollowUpMeeting,
  // une fois le consultant choisi.
  @Get('slots')
  @Public()
  @ApiOperation({
    summary: "Créneaux libres d'un consultant pour une journée donnée",
  })
  async getAvailableSlots(
    @Query('destinationId') destinationId: string,
    @Query('date') date: string,
    @Query('consultantId') consultantId?: string,
  ) {
    if (!destinationId || !date) {
      throw new BadRequestException('destinationId et date sont requis');
    }
    return this.availabilityService.getAvailableSlotsForDay({
      destinationId,
      date: this.parseDate(date),
      consultantId,
    });
  }

  // Vérification précise d'un créneau unique juste avant soumission —
  // exige une authentification car c'est la dernière étape avant un appel
  // de mutation réel (create RendezVous/FollowUpMeeting), donc pas de
  // valeur à l'exposer anonymement. Ne remplace jamais la revérification
  // sous verrou déjà faite dans RendezVousService/FollowUpMeetingService
  // (README : "vérification complète des disponibilités obligatoire avant
  // toute création") — c'est un aperçu pour l'UX, pas une garantie
  // transactionnelle.
  @Get('check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ETUDIANT, UserRole.CONSULTANT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Vérification indicative d'un créneau avant soumission (non transactionnelle)",
  })
  async checkSlot(
    @Query('consultantId') consultantId: string,
    @Query('destinationId') destinationId: string,
    @Query('date') date: string,
    @Query('time') time: TimeSlot,
  ) {
    if (!consultantId || !destinationId || !date || !time) {
      throw new BadRequestException(
        'consultantId, destinationId, date et time sont requis',
      );
    }
    return this.availabilityService.checkSlotAvailability({
      consultantId,
      destinationId,
      date: this.parseDate(date),
      time,
    });
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Date invalide : ${value}`);
    }
    return date;
  }
}
