import { Injectable, Logger } from '@nestjs/common';
import Holidays from 'date-holidays';
import {
  HOLIDAY_CACHE_YEARS_AHEAD,
  HOLIDAY_COUNTRY_CODE,
} from './constants/availability.constants';

interface HolidayEntry {
  date: string;
  name: string;
}

// Calcule et met en cache les jours fériés maliens. Cache en mémoire
// process (pas Redis) : les jours fériés d'une année donnée ne changent
// jamais une fois publiés, un recalcul par instance au démarrage est
// négligeable et évite une dépendance Redis pour une donnée quasi statique.
@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);
  private readonly holidaysByYear = new Map<number, Map<string, string>>();
  private readonly engine = new Holidays(HOLIDAY_COUNTRY_CODE);

  private getYearMap(year: number): Map<string, string> {
    let yearMap = this.holidaysByYear.get(year);

    if (yearMap) {
      return yearMap;
    }

    yearMap = new Map<string, string>();
    const holidays = (this.engine.getHolidays(year) as HolidayEntry[]) ?? [];

    for (const holiday of holidays) {
      const dateKey = holiday.date.slice(0, 10);
      yearMap.set(dateKey, holiday.name);
    }

    this.holidaysByYear.set(year, yearMap);
    this.logger.debug(`Jours fériés ${year} chargés (${yearMap.size} entrées)`);

    return yearMap;
  }

  preloadYears(): void {
    const currentYear = new Date().getFullYear();
    for (let offset = 0; offset <= HOLIDAY_CACHE_YEARS_AHEAD; offset++) {
      this.getYearMap(currentYear + offset);
    }
  }

  getHolidayName(date: Date): string | null {
    const year = date.getFullYear();
    const dateKey = this.toDateKey(date);
    return this.getYearMap(year).get(dateKey) ?? null;
  }

  isHoliday(date: Date): boolean {
    return this.getHolidayName(date) !== null;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
