/**
 * Consulta local de estadísticas ficticias. Filtra por fecha programada de cita;
 * asistencias y duraciones corresponden a esa cohorte, no a un periodo independiente.
 * Se documenta esta referencia temporal en UI y docs/api-integration.md.
 */
import type { Appointment, Branch, ReportFilters, ReportMetrics } from '../../types/domain';
import { localDate } from '../../utils/format';

export function filterAppointments(
  appointments: Appointment[],
  branches: Branch[],
  filters: ReportFilters,
): Appointment[] {
  const allowed = new Set(
    branches
      .filter(
        (branch) =>
          (!filters.branchId || branch.id === filters.branchId) &&
          (!filters.municipality || branch.municipality === filters.municipality) &&
          (!filters.branchType || branch.type === filters.branchType),
      )
      .map((branch) => branch.id),
  );
  return appointments.filter((appointment) => {
    const date = localDate(appointment.scheduledAt);
    return (
      allowed.has(appointment.branchId) &&
      (!filters.from || date >= filters.from) &&
      (!filters.to || date <= filters.to) &&
      (!filters.procedureId || appointment.procedureId === filters.procedureId) &&
      (!filters.status || appointment.status === filters.status)
    );
  });
}

const duration = (from: string | null, to: string | null): number | null => {
  if (!from || !to) return null;
  const delta = (Date.parse(to) - Date.parse(from)) / 60_000;
  return Number.isFinite(delta) && delta >= 0 ? delta : null;
};
const mean = (values: (number | null)[]) => {
  const complete = values.filter((value): value is number => value !== null);
  return complete.length
    ? Math.round(complete.reduce((sum, value) => sum + value, 0) / complete.length)
    : null;
};

/** Cuenta personas distintas y excluye duraciones incompletas o negativas del promedio. */
export function calculateMetrics(appointments: Appointment[]): ReportMetrics {
  return {
    appointments: appointments.length,
    citizens: new Set(appointments.map((appointment) => appointment.citizenId)).size,
    arrivals: appointments.filter((appointment) => appointment.arrivedAt).length,
    completed: appointments.filter((appointment) => appointment.endedAt).length,
    cancelled: appointments.filter((appointment) => appointment.status === 'CANCELLED').length,
    noShows: appointments.filter((appointment) => appointment.status === 'NO_SHOW').length,
    meanWaitMinutes: mean(
      appointments.map((appointment) => duration(appointment.arrivedAt, appointment.startedAt)),
    ),
    meanAttentionMinutes: mean(
      appointments.map((appointment) => duration(appointment.startedAt, appointment.endedAt)),
    ),
  };
}

/** Rango completo del mes indicado, inclusive en fechas civiles de Chiapas. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}
