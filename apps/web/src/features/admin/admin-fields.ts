/** Campos de publicación compartidos entre catálogo y sedes; coinciden con las restricciones de BD. */
import type { AdminField } from './AdminUI';
export const publicationFields: AdminField[] = [
  { name: 'active', label: 'Activo', type: 'checkbox' },
  { name: 'published', label: 'Publicado para consulta ciudadana', type: 'checkbox' },
  {
    name: 'sourceKey',
    label: 'Clave de la fuente corroborada',
    hint: 'La publicación requiere fuente oficial corroborada. No inventes claves ni hashes.',
  },
  { name: 'sourceUrl', label: 'URL HTTPS de la fuente' },
  { name: 'sourceSha256', label: 'SHA-256 de la fuente', maxLength: 64 },
  { name: 'sourceCheckedAt', label: 'Fecha de corroboración', type: 'date' },
];
