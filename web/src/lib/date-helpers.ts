// src/lib/date-helpers.ts

/**
 * Formate une date au format français lisible (ex: "lundi 25 août 2026")
 */
export function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formate une date courte (ex: "25/08/2026")
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formate une date avec heure (ex: "25/08/2026 à 14h30")
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formate une date au format "Aujourd'hui", "Demain", "Hier" ou date courte
 */
export function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    if (diff === -1) return 'Hier';
    if (diff > 0 && diff <= 6) return `Dans ${diff} jours`;
    if (diff < 0 && diff >= -6) return `Il y a ${Math.abs(diff)} jours`;
    
    return formatFrenchDate(dateStr);
  } catch {
    return dateStr;
  }
}

/**
 * Vérifie si une date est passée
 */
export function isDatePassed(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  } catch {
    return false;
  }
}

/**
 * Vérifie si une date est dans le futur
 */
export function isFutureDate(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d > today;
  } catch {
    return false;
  }
}

/**
 * Formate une date pour l'API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Retourne la date du jour au format YYYY-MM-DD
 */
export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ajoute ou soustrait des jours à une date
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

/**
 * Obtient le nom du jour de la semaine
 */
export function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(d);
  } catch {
    return '';
  }
}

/**
 * Compare deux dates (ignorant l'heure)
 * Retourne -1 si a < b, 0 si a === b, 1 si a > b
 */
export function compareDates(a: string, b: string): number {
  if (!a || !b) return 0;
  try {
    const da = new Date(a.includes('T') ? a : `${a}T00:00:00`);
    const db = new Date(b.includes('T') ? b : `${b}T00:00:00`);
    da.setHours(0, 0, 0, 0);
    db.setHours(0, 0, 0, 0);
    if (da < db) return -1;
    if (da > db) return 1;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Groupe un tableau d'objets par date
 */
export function groupByDate<T extends { date: string }>(
  items: T[],
  dateKey: keyof T = 'date' as keyof T
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  for (const item of items) {
    const dateStr = item[dateKey] as string;
    if (!dateStr) continue;
    
    const key = dateStr.split('T')[0];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  return groups;
}

/**
 * Trie un tableau d'objets par date (ascendant)
 */
export function sortByDateAsc<T extends { date: string }>(
  items: T[],
  dateKey: keyof T = 'date' as keyof T
): T[] {
  return [...items].sort((a, b) => {
    const da = new Date(a[dateKey] as string);
    const db = new Date(b[dateKey] as string);
    return da.getTime() - db.getTime();
  });
}

/**
 * Trie un tableau d'objets par date (descendant)
 */
export function sortByDateDesc<T extends { date: string }>(
  items: T[],
  dateKey: keyof T = 'date' as keyof T
): T[] {
  return [...items].sort((a, b) => {
    const da = new Date(a[dateKey] as string);
    const db = new Date(b[dateKey] as string);
    return db.getTime() - da.getTime();
  });
}

/**
 * Vérifie si une chaîne est une date valide
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  return !isNaN(d.getTime());
}

/**
 * Formate une date avec style personnalisé
 */
export function formatDateCustom(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return new Intl.DateTimeFormat('fr-FR', options).format(d);
  } catch {
    return dateStr;
  }
}