/** Etiquetas de estados demostrativos; no asumir que son enumeraciones de la API. */
import type { AppointmentStatus } from '../../types/domain';

export const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Programada',
  ATTENDED: 'Atendida',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};
export const statusTones: Record<AppointmentStatus, 'green' | 'pink' | 'amber' | 'neutral'> = {
  SCHEDULED: 'amber',
  ATTENDED: 'green',
  CANCELLED: 'pink',
  NO_SHOW: 'neutral',
};
