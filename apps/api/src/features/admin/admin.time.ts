/**
 * Fechas y horas administrativas. Chiapas usa America/Mexico_City sin horario de
 * verano desde 2023: el desfase fijo -06:00 es suficiente para los periodos.
 */
import { fieldFailure } from '../../core/validation/validation.js';

export const MEXICO_CITY_OFFSET = '-06:00';

export function startOfMexicoDay(date: string): Date {
  return new Date(`${date}T00:00:00${MEXICO_CITY_OFFSET}`);
}

export function endOfMexicoDay(date: string): Date {
  return new Date(`${date}T23:59:59.999${MEXICO_CITY_OFFSET}`);
}

export function assertDateRange(from: string, to: string) {
  const start = startOfMexicoDay(from);
  const end = endOfMexicoDay(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end)
    throw fieldFailure({ from: 'Revisa el periodo: la fecha inicial debe ser anterior o igual a la final.' });
  return { start, end };
}

/** Convierte 'HH:MM' a minutos desde medianoche. Lanza si el formato no es válido. */
export function timeToMinutes(time: string): number {
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(time);
  if (!match) throw fieldFailure({ startsAt: 'Escribe una hora válida en formato HH:MM.' });
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Hora de PostgreSQL (@db.Time) expresada como Date en UTC. */
export function timeToDate(time: string): Date {
  const minutes = timeToMinutes(time);
  return new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60));
}

export function dateToTime(value: Date): string {
  return minutesToTime(value.getUTCHours() * 60 + value.getUTCMinutes());
}

/** Fecha de PostgreSQL (@db.Date) expresada como Date en UTC. */
export function dateOnlyToDate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw fieldFailure({ date: 'Escribe una fecha válida.' });
  return parsed;
}

export function dateToDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): boolean {
  return firstStart < secondEnd && firstEnd > secondStart;
}

/** Marca local de Chiapas para exportaciones: 'YYYY-MM-DD HH:MM'. */
export function mexicoStamp(value: Date | null | undefined): string {
  if (!value) return '';
  const local = new Date(value.getTime() - 6 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 10)} ${local.toISOString().slice(11, 16)}`;
}

/** Fecha local de Chiapas en formato YYYY-MM-DD. */
export function mexicoDate(value: Date): string {
  return new Date(value.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
