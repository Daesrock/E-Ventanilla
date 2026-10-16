/** Lectura de parámetros de consulta y utilidades compartidas del panel. */
import { fieldFailure } from '../../core/validation/validation.js';

export function optionalText(value: unknown, field: string, max = 120): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string')
    throw fieldFailure({ [field]: 'Escribe un solo valor de búsqueda.' });
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > max) throw fieldFailure({ [field]: 'La búsqueda es demasiado larga.' });
  return text;
}

export function optionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw fieldFailure({ [field]: 'El identificador no es válido.' });
  return value;
}

export function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw fieldFailure({ [field]: 'Escribe una fecha en formato AAAA-MM-DD.' });
  const parts = value.split('-').map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    throw fieldFailure({ [field]: 'Escribe una fecha válida.' });
  return value;
}

export function optionalFlag(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw fieldFailure({ [field]: 'Usa true o false.' });
}

function positiveInt(value: unknown, field: string, fallback: number, max: number) {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > max)
    throw fieldFailure({ [field]: `Escribe un número entre 1 y ${max}.` });
  return parsed;
}

export function pageParams(query: Record<string, unknown>) {
  const page = positiveInt(query.page, 'page', 1, 100000);
  const pageSize = positiveInt(query.pageSize, 'pageSize', 25, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function personName(user: {
  firstName: string;
  lastName: string;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
}) {
  const surnames = [user.paternalLastName, user.maternalLastName].filter(Boolean).join(' ');
  return [user.firstName, surnames || user.lastName].filter(Boolean).join(' ');
}

export function providedFields(dto: object) {
  return Object.entries(dto)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
}
