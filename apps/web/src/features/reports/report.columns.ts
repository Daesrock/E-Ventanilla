/** Columnas consultables y exportables. Un único contrato mantiene tabla y CSV consistentes. */
import type { Appointment, DemoDatabase } from '../../types/domain';
import { dateLabel, timeLabel } from '../../utils/format';
import { statusLabels } from '../appointments/appointment.config';

interface ReportColumn {
  id: string;
  label: string;
  value: (appointment: Appointment, db: DemoDatabase) => string;
}
const minutes = (from: string | null, to: string | null) => {
  if (!from || !to) return '—';
  const value = (Date.parse(to) - Date.parse(from)) / 60_000;
  return Number.isFinite(value) && value >= 0 ? `${Math.round(value)} min` : '—';
};
export const reportColumns: ReportColumn[] = [
  { id: 'folio', label: 'Folio', value: (row) => row.folio },
  { id: 'citizen', label: 'Ciudadano', value: (row) => row.citizenName },
  {
    id: 'municipality',
    label: 'Municipio',
    value: (row, db) =>
      db.branches.find((branch) => branch.id === row.branchId)?.municipality ?? '—',
  },
  {
    id: 'branch',
    label: 'Sede',
    value: (row, db) => db.branches.find((branch) => branch.id === row.branchId)?.name ?? '—',
  },
  {
    id: 'type',
    label: 'VUGE / VIM',
    value: (row, db) => db.branches.find((branch) => branch.id === row.branchId)?.type ?? '—',
  },
  {
    id: 'procedure',
    label: 'Trámite',
    value: (row, db) =>
      db.procedures.find((procedure) => procedure.id === row.procedureId)?.name ?? '—',
  },
  {
    id: 'date',
    label: 'Fecha y hora',
    value: (row) => `${dateLabel(row.scheduledAt)} ${timeLabel(row.scheduledAt)}`,
  },
  { id: 'status', label: 'Estado', value: (row) => statusLabels[row.status] },
  {
    id: 'result',
    label: 'Resultado',
    value: (row) => row.finalStatus ?? 'Sin resultado registrado',
  },
  { id: 'wait', label: 'Espera', value: (row) => minutes(row.arrivedAt, row.startedAt) },
  { id: 'attention', label: 'Atención', value: (row) => minutes(row.startedAt, row.endedAt) },
];
export const defaultColumns = ['folio', 'branch', 'procedure', 'status'];
