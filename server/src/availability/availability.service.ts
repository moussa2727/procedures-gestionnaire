// availability/availability.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';

import { ConsultantDestinationService } from '@/destinations/consultant-destination/consultant-destination.service';

import { HolidayService } from './holiday.service';

import {
  FRENCH_WEEKDAY_NAMES,
  ORDERED_TIME_SLOTS,
  TIME_SLOT_CLOCK,
  WORKING_DAYS,
} from './constants/availability.constants';

import {
  AvailableSlotsForDayInput,
  DayAvailability,
  DisponibiliteCheckInput,
  SlotAvailabilityResult,
  SlotConflict,
} from './interfaces/availability.interfaces';

import {
  FollowUpMeeting,
  RendezVous,
  RendezvousStatus,
  MeetingStatus,
  TimeSlot,
  UserRole,
} from '@prisma/client';

import { ConsultantUnavailabilityService } from './consultant-unaivailability/consultant-unavailability.service';
import { RedisService } from '@/redis/redis.service';

// Statuts de RendezVous considérés comme occupant réellement le créneau.

// PENDING et CONFIRMED bloquent ; COMPLETED et CANCELLED libèrent — ce sont

// des états finaux selon le README ("Un rendez-vous TERMINE ou ANNULE

// devient non modifiable"), donc le créneau redevient disponible.

const ACTIVE_RENDEZVOUS_STATUSES: RendezvousStatus[] = [
  RendezvousStatus.PENDING,

  RendezvousStatus.CONFIRMED,
];

// Même principe pour FollowUpMeeting : "Un FollowUpMeeting CONFIRMED ou

// PENDING bloque le créneau du consultant. Un FollowUpMeeting COMPLETED ou

// CANCELLED libère le créneau."

const ACTIVE_MEETING_STATUSES: MeetingStatus[] = [
  MeetingStatus.PENDING,

  MeetingStatus.CONFIRMED,
];

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly holidayService: HolidayService,
    private readonly redisService: RedisService,

    private readonly consultantDestinationService: ConsultantDestinationService,

    private readonly consultantUnavailabilityService: ConsultantUnavailabilityService,
  ) {}

  // ==================== REGLES CALENDAIRES ====================

  //

  // README, ordre obligatoire des validations : les règles calendaires

  // (jours fériés, week-ends) sont appliquées EN PREMIER, avant toute

  // vérification de réservation — c'est la vérification la moins coûteuse

  // et elle élimine la majorité des requêtes invalides avant toute lecture

  // en base. L'absence consultant (journée noire) est vérifiée avant

  // celles-ci puisqu'elle prime sur tout, y compris les jours ouvrables.

  isWeekend(date: Date): boolean {
    const day = date.getDay();

    return !WORKING_DAYS.includes(day as (typeof WORKING_DAYS)[number]);
  }

  isWorkableDay(date: Date): boolean {
    return !this.isWeekend(date) && !this.holidayService.isHoliday(date);
  }

  getHolidayName(date: Date): string | null {
    return this.holidayService.getHolidayName(date);
  }

  // Un créneau est passé s'il est strictement antérieur à l'instant

  // présent. Pour une date future, aucun créneau n'est jamais passé ; pour

  // aujourd'hui, chaque créneau est comparé à l'heure courante. Conforme

  // au README : "Impossible de créer ou réplanifier un rendez-vous dans le

  // passé."

  isSlotInPast(date: Date, time: TimeSlot): boolean {
    const now = new Date();

    const slotDay = this.startOfDay(date);

    const today = this.startOfDay(now);

    if (slotDay.getTime() > today.getTime()) {
      return false;
    }

    if (slotDay.getTime() < today.getTime()) {
      return true;
    }

    const clock = TIME_SLOT_CLOCK[time];

    const slotDateTime = new Date(date);

    slotDateTime.setHours(clock.hour, clock.minute, 0, 0);

    return slotDateTime.getTime() <= now.getTime();
  }

  formatSlotLabel(time: TimeSlot): string {
    const clock = TIME_SLOT_CLOCK[time];

    const hour = String(clock.hour).padStart(2, '0');

    const minute = String(clock.minute).padStart(2, '0');

    return `${hour}h${minute}`;
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);

    copy.setHours(0, 0, 0, 0);

    return copy;
  }

  private getFrenchWeekdayName(date: Date): string {
    return FRENCH_WEEKDAY_NAMES[date.getDay()];
  }

  // ==================== VERIFICATION D'UN CRENEAU UNIQUE ====================

  //

  // Ordre strict : existence destination -> existence consultant ->

  // rattachement du consultant à la destination -> ABSENCE (journée noire,

  // prime sur week-end/jours fériés/booking, portée globale toutes

  // destinations) -> week-end -> jour férié -> créneau passé -> conflit

  // ConsultantBooking (source de vérité, vérifiée en dernier).

  async checkSlotAvailability(
    input: DisponibiliteCheckInput,
  ): Promise<SlotAvailabilityResult> {
    const destination = await this.prisma.destination.findFirst({
      where: { id: input.destinationId, isDeleted: false },
    });

    if (!destination) {
      return {
        available: false,
        reason: 'Destination introuvable ou désactivée',
      };
    }

    const consultant = await this.prisma.user.findFirst({
      where: {
        id: input.consultantId,

        role: UserRole.CONSULTANT,

        isDeleted: false,

        isActive: true,
      },
    });

    if (!consultant) {
      return {
        available: false,
        reason: 'Consultant introuvable, désactivé ou inactif',
      };
    }

    const isAssigned =
      await this.consultantDestinationService.isConsultantAssignedToDestination(
        input.consultantId,

        input.destinationId,
      );

    if (!isAssigned) {
      return {
        available: false,

        reason: "Ce consultant n'est pas affecté à la destination sélectionnée",
      };
    }

    const isAbsent = await this.consultantUnavailabilityService.isAbsentOnDate(
      input.consultantId,

      input.date,
    );

    if (isAbsent) {
      return {
        available: false,
        reason: 'Le consultant est indisponible à cette date',
      };
    }

    if (this.isWeekend(input.date)) {
      return {
        available: false,

        reason: 'Les rendez-vous ne sont pas disponibles le week-end',
      };
    }

    const holidayName = this.getHolidayName(input.date);

    if (holidayName) {
      return { available: false, reason: `Jour férié : ${holidayName}` };
    }

    if (this.isSlotInPast(input.date, input.time)) {
      return {
        available: false,
        reason: 'Impossible de prendre un rendez-vous dans le passé',
      };
    }

    const conflict = await this.findBookingConflict(
      input.consultantId,

      input.date,

      input.time,

      input.excludeBookingId,
    );

    if (conflict) {
      return {
        available: false,

        reason: 'Le consultant a déjà un rendez-vous à ce créneau',

        conflict,
      };
    }

    return { available: true };
  }

  // ==================== RESOLUTION DU CONFLIT (SOURCE DE VERITE) ====================

  //

  // ConsultantBooking est vérifié en premier — c'est la source la plus

  // fiable, garantie par la contrainte @@unique([consultantId, date, time])

  // au niveau base de données. Si un booking existe, son état réel est

  // résolu via le RendezVous ou le FollowUpMeeting qu'il référence : un

  // booking dont la cible est COMPLETED/CANCELLED ne bloque plus le

  // créneau, même si la ligne ConsultantBooking existe encore

  // physiquement.

  private async findBookingConflict(
    consultantId: string,

    date: Date,

    time: TimeSlot,

    excludeBookingId?: string,
  ): Promise<SlotConflict | null> {
    const booking = await this.prisma.consultantBooking.findUnique({
      where: {
        consultantId_date_time: {
          consultantId,
          date: this.startOfDay(date),
          time,
        },
      },

      include: { rendezVous: true, followUpMeeting: true },
    });

    if (!booking || booking.id === excludeBookingId) {
      return null;
    }

    if (booking.rendezVousId && booking.rendezVous) {
      if (this.isActiveRendezVous(booking.rendezVous)) {
        return {
          type: 'RENDEZ_VOUS',
          id: booking.rendezVous.id,
          bookingId: booking.id,
        };
      }

      return null;
    }

    if (booking.followUpMeetingId && booking.followUpMeeting) {
      if (this.isActiveFollowUpMeeting(booking.followUpMeeting)) {
        return {
          type: 'FOLLOW_UP_MEETING',
          id: booking.followUpMeeting.id,
          bookingId: booking.id,
        };
      }

      return null;
    }

    // Booking sans cible valide référencée — état incohérent violant

    // l'invariant de non-orphelinat. Traité comme conflit bloquant pour ne

    // jamais autoriser une double réservation silencieuse, et signalé en

    // log pour investigation.

    this.logger.error(
      `ConsultantBooking ${booking.id} sans RendezVous ni FollowUpMeeting associé — invariant de non-orphelinat violé`,
    );

    return { type: 'BOOKING_ORPHAN', id: booking.id, bookingId: booking.id };
  }

  private isActiveRendezVous(rendezVous: RendezVous): boolean {
    return ACTIVE_RENDEZVOUS_STATUSES.includes(rendezVous.status);
  }

  private isActiveFollowUpMeeting(meeting: FollowUpMeeting): boolean {
    return ACTIVE_MEETING_STATUSES.includes(meeting.status);
  }

  // ==================== CRENEAUX LIBRES POUR UNE JOURNEE ====================

  //

  // 1. Absence vérifiée en tout premier (avant même le calcul week-end

  //    n'a de sens que si un consultant précis est fourni) : retour []

  //    immédiat sans consulter ConsultantBooking.

  // 2. Récupère TOUS les bookings du consultant pour cette date.

  // 3. Filtre les statuts actifs via résolution RendezVous/FollowUpMeeting.

  // 4. Retourne les créneaux libres = ORDERED_TIME_SLOTS - créneaux occupés.

  async getAvailableSlotsForDay(
    input: AvailableSlotsForDayInput,
  ): Promise<TimeSlot[]> {
    if (
      this.isWeekend(input.date) ||
      this.holidayService.isHoliday(input.date)
    ) {
      return [];
    }

    if (!input.consultantId) {
      return ORDERED_TIME_SLOTS.filter(
        (slot) => !this.isSlotInPast(input.date, slot),
      );
    }

    const isAbsent = await this.consultantUnavailabilityService.isAbsentOnDate(
      input.consultantId,

      input.date,
    );

    if (isAbsent) {
      return [];
    }

    const dayStart = this.startOfDay(input.date);

    const bookings = await this.prisma.consultantBooking.findMany({
      where: { consultantId: input.consultantId, date: dayStart },

      include: { rendezVous: true, followUpMeeting: true },
    });

    const occupiedSlots = new Set<TimeSlot>();

    for (const booking of bookings) {
      const isActiveTarget =
        (booking.rendezVousId &&
          booking.rendezVous &&
          this.isActiveRendezVous(booking.rendezVous)) ||
        (booking.followUpMeetingId &&
          booking.followUpMeeting &&
          this.isActiveFollowUpMeeting(booking.followUpMeeting));

      if (isActiveTarget) {
        occupiedSlots.add(booking.time);
      }
    }

    return ORDERED_TIME_SLOTS.filter(
      (slot) =>
        !occupiedSlots.has(slot) && !this.isSlotInPast(input.date, slot),
    );
  }

  // ==================== DISPONIBILITE D'UNE JOURNEE (VUE CALENDRIER) ====================

  async getDayAvailability(
    destinationId: string,

    date: Date,

    consultantId?: string,
  ): Promise<DayAvailability> {
    const isWeekend = this.isWeekend(date);

    const holidayName = this.getHolidayName(date);

    const isHoliday = holidayName !== null;

    const isWorkable = !isWeekend && !isHoliday;

    let availableSlots: TimeSlot[] = [];

    if (isWorkable) {
      if (consultantId) {
        availableSlots = await this.getAvailableSlotsForDay({
          consultantId,
          destinationId,
          date,
        });
      } else {
        // Aucun consultant précisé : au moins un consultant actif de la

        // destination doit avoir un créneau libre pour que la journée soit

        // considérée disponible. getAvailableSlotsForDay filtre déjà les

        // consultants absents individuellement.

        const consultantIds =
          await this.consultantDestinationService.listActiveConsultantIdsForDestination(
            destinationId,
          );

        const slotSets = await Promise.all(
          consultantIds.map((id) =>
            this.getAvailableSlotsForDay({
              consultantId: id,
              destinationId,
              date,
            }),
          ),
        );

        const union = new Set<TimeSlot>();

        for (const slots of slotSets) {
          for (const slot of slots) {
            union.add(slot);
          }
        }

        availableSlots = ORDERED_TIME_SLOTS.filter((slot) => union.has(slot));
      }
    }

    return {
      date: date.toISOString().slice(0, 10),

      dayOfWeek: this.getFrenchWeekdayName(date),

      isWorkable,

      isWeekend,

      isHoliday,

      holidayName,

      hasAvailableSlots: availableSlots.length > 0,

      availableSlots,
    };
  }

  // ==================== DISPONIBILITE SUR UNE PERIODE ====================

  //

  // Calcule toutes les dates disponibles sur une période donnée, en

  // excluant week-ends, jours fériés et journées sans créneau libre

  // (y compris celles bloquées par une absence consultant).

  // Filtrable par consultant.

  async getAvailabilityRange(
    destinationId: string,

    startDate: Date,

    endDate: Date,

    consultantId?: string,
  ): Promise<DayAvailability[]> {
    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin',
      );
    }

    const days: DayAvailability[] = [];

    const cursor = this.startOfDay(startDate);

    const end = this.startOfDay(endDate);

    while (cursor.getTime() <= end.getTime()) {
      const dayAvailability = await this.getDayAvailability(
        destinationId,

        new Date(cursor),

        consultantId,
      );

      if (dayAvailability.isWorkable && dayAvailability.hasAvailableSlots) {
        days.push(dayAvailability);
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  // ==================== VALIDATION D'ENTREE POUR LES MODULES CONSOMMATEURS ====================

  //

  // Point d'entrée unique que RendezVous et FollowUpMeeting doivent appeler

  // avant toute réservation. Lève une exception métier explicite si le

  // créneau n'est pas disponible, conformément au README ("le retour d'une

  // erreur métier explicite" en cas de violation d'invariant).

  async assertSlotAvailable(input: DisponibiliteCheckInput): Promise<void> {
    const result = await this.checkSlotAvailability(input);

    if (!result.available) {
      throw new BadRequestException(result.reason ?? 'Créneau indisponible');
    }
  }

  /**
   * Invalide le cache des consultants pour une destination
   * À appeler après une modification des affectations
   */
  async invalidateConsultantCache(destinationId: string): Promise<void> {
    const client = this.redisService.getClient();
    const cacheKey = `availability:consultants:${destinationId}`;
    await client.del(cacheKey);
    this.logger.debug(
      `Cache consultants invalidé pour destination ${destinationId}`,
    );
  }

  // Identifie le conflit exact bloquant un créneau, pour traçabilité —

  // README : "Retour : Identifiant du conflit (rendezvousId ou bookingId

  // ou followUpMeetingId) pour traçabilité."

  async getSlotConflict(
    consultantId: string,

    date: Date,

    time: TimeSlot,
  ): Promise<SlotConflict | null> {
    return this.findBookingConflict(consultantId, date, time);
  }
}
