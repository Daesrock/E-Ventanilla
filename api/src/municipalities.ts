import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fieldFailure } from './validation.js';

export interface Municipality { code: string; name: string }
export const municipalityCatalog: { metadata: Record<string, string>; municipalities: Municipality[] } =
  JSON.parse(readFileSync(new URL('../resources/municipalities.json', import.meta.url), 'utf8'));
const items = municipalityCatalog.municipalities;
const codes = new Map(items.map(item => [item.code, item]));
if (!items.length || codes.size !== items.length || items.some(item => !/^07\d{3}$/.test(item.code) || !item.name.trim()) ||
  createHash('sha256').update(JSON.stringify(items)).digest('hex') !== municipalityCatalog.metadata.municipalitiesSha256) {
  throw new Error('El catálogo de municipios no supera la verificación de integridad.');
}

export const normalizeMunicipality = (name: string) => name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');

export function resolveMunicipality(code?: string | null, name?: string | null): Municipality {
  if (code != null) {
    const item = codes.get(code);
    if (!item) throw fieldFailure({ municipalityCode: 'Selecciona un municipio del catálogo de Chiapas.' });
    if (name != null && normalizeMunicipality(name) !== normalizeMunicipality(item.name)) {
      throw fieldFailure({ municipalityCode: 'La clave y el nombre de municipio no coinciden.' });
    }
    return item;
  }
  const matches = name ? items.filter(item => normalizeMunicipality(item.name) === normalizeMunicipality(name)) : [];
  if (matches.length !== 1) throw fieldFailure({ municipality: 'Selecciona un municipio del catálogo de Chiapas.' });
  return matches[0]!;
}
