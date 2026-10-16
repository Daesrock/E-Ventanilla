/**
 * Publicación con fuente corroborada: exige clave, URL https, sha256 y fecha,
 * igual que las restricciones `*_publication_source_check` de PostgreSQL.
 */
import { fieldFailure } from '../../core/validation/validation.js';

export interface PublicationSource {
  sourceKey?: string | null;
  sourceUrl?: string | null;
  sourceSha256?: string | null;
  sourceCheckedAt?: string | Date | null;
}

export function assertPublicationSource(source: PublicationSource) {
  const missing: Record<string, string> = {};
  if (!source.sourceKey) missing.sourceKey = 'Indica la clave de la fuente oficial.';
  let validUrl = false;
  try {
    const url = new URL(source.sourceUrl ?? '');
    validUrl = url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch {
    /* La fuente incompleta se devuelve como error de campo. */
  }
  if (!validUrl) missing.sourceUrl = 'Indica la URL https de la fuente oficial.';
  if (!source.sourceSha256 || !/^[a-f0-9]{64}$/.test(source.sourceSha256))
    missing.sourceSha256 = 'Indica el sha256 (64 hexadecimales) de la fuente corroborada.';
  if (!source.sourceCheckedAt || !Number.isFinite(new Date(source.sourceCheckedAt).getTime()))
    missing.sourceCheckedAt = 'Indica la fecha en que se corroboró la fuente.';
  if (Object.keys(missing).length) throw fieldFailure(missing);
}
