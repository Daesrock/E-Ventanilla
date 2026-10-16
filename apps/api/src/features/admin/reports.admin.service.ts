/**
 * Reportes administrativos calculados al consultar, con el mismo alcance de la
 * consulta y exportación CSV filtrada. Definiciones vigentes: citas por fecha
 * programada (America/Mexico_City), ciudadanos únicos, asistencia por llegada
 * registrada y atención por fecha de fin; promedios solo con tiempos completos.
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { fieldFailure } from '../../core/validation/validation.js';
import { assertDateRange, mexicoStamp } from './admin.time.js';
import { assertBranchScope } from './admin.auth.js';
import { optionalDate, optionalText, optionalUuid, pageParams, personName } from './admin.shared.js';
import type { AdminContext } from './admin.types.js';

const reportRowSelect = {
  id: true,
  folio: true,
  status: true,
  scheduledAt: true,
  // Appointment no tiene relaciones directas a sede/trámite: se llega por cupo y oferta.
  slot: {
    select: {
      branch: {
        select: { name: true, type: true, municipality: { select: { code: true, name: true } } },
      },
    },
  },
  offering: { select: { procedure: { select: { name: true } } } },
  citizen: {
    select: {
      user: {
        select: {
          firstName: true,
          paternalLastName: true,
          maternalLastName: true,
          lastName: true,
        },
      },
    },
  },
  attendance: {
    select: { arrivedAt: true, startedAt: true, endedAt: true, late: true },
  },
} satisfies Prisma.AppointmentSelect;

type ReportRow = Prisma.AppointmentGetPayload<{ select: typeof reportRowSelect }>;

export interface ReportLeanRow {
  citizenId: string;
  attendance: { arrivedAt: Date; startedAt: Date | null; endedAt: Date | null; late: boolean } | null;
}

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/** Resumen puro para pruebas: citas, ciudadanos únicos, asistencia y promedios. */
export function summarize(rows: ReportLeanRow[]) {
  const citizens = new Set(rows.map((row) => row.citizenId));
  const waits: number[] = [];
  const services: number[] = [];
  let attended = 0;
  let completed = 0;
  let late = 0;
  for (const row of rows) {
    if (!row.attendance) continue;
    attended += 1;
    if (row.attendance.late) late += 1;
    if (row.attendance.startedAt && row.attendance.startedAt >= row.attendance.arrivedAt)
      waits.push(minutesBetween(row.attendance.arrivedAt, row.attendance.startedAt));
    if (
      row.attendance.endedAt &&
      row.attendance.startedAt &&
      row.attendance.endedAt >= row.attendance.startedAt
    )
      services.push(minutesBetween(row.attendance.startedAt, row.attendance.endedAt));
    if (row.attendance.endedAt) completed += 1;
  }
  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  return {
    appointments: rows.length,
    citizens: citizens.size,
    attended,
    completed,
    late,
    averageWaitMinutes: average(waits),
    averageServiceMinutes: average(services),
  };
}

export const REPORT_COLUMNS = {
  folio: 'FOLIO',
  scheduledAt: 'FECHA PROGRAMADA',
  branch: 'SEDE',
  branchType: 'TIPO',
  municipality: 'MUNICIPIO',
  municipalityCode: 'CLAVE MUNICIPIO',
  procedure: 'TRÁMITE',
  citizen: 'CIUDADANO',
  status: 'ESTADO',
  arrivedAt: 'LLEGADA',
  startedAt: 'INICIO',
  endedAt: 'FIN',
  late: 'TARDE',
  waitMinutes: 'ESPERA (MIN)',
  serviceMinutes: 'ATENCIÓN (MIN)',
} as const;

export type ReportColumn = keyof typeof REPORT_COLUMNS;
export const DEFAULT_REPORT_COLUMNS = Object.keys(REPORT_COLUMNS) as ReportColumn[];

export function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r;]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

function present(row: ReportRow) {
  const attendance = row.attendance;
  const branch = row.slot.branch;
  return {
    folio: row.folio,
    scheduledAt: row.scheduledAt.toISOString(),
    branch: branch.name,
    branchType: branch.type,
    municipality: branch.municipality.name,
    municipalityCode: branch.municipality.code,
    procedure: row.offering.procedure.name,
    citizen: personName(row.citizen.user),
    status: row.status,
    arrivedAt: attendance?.arrivedAt.toISOString() ?? null,
    startedAt: attendance?.startedAt?.toISOString() ?? null,
    endedAt: attendance?.endedAt?.toISOString() ?? null,
    late: attendance?.late ?? null,
    waitMinutes:
      attendance?.startedAt && attendance.startedAt >= attendance.arrivedAt
        ? minutesBetween(attendance.arrivedAt, attendance.startedAt)
        : null,
    serviceMinutes:
      attendance?.endedAt && attendance.startedAt && attendance.endedAt >= attendance.startedAt
        ? minutesBetween(attendance.startedAt, attendance.endedAt)
        : null,
  };
}

type ReportItem = ReturnType<typeof present>;

function csvValue(column: ReportColumn, item: ReportItem) {
  switch (column) {
    case 'scheduledAt':
      return mexicoStamp(new Date(item.scheduledAt));
    case 'arrivedAt':
      return mexicoStamp(item.arrivedAt ? new Date(item.arrivedAt) : null);
    case 'startedAt':
      return mexicoStamp(item.startedAt ? new Date(item.startedAt) : null);
    case 'endedAt':
      return mexicoStamp(item.endedAt ? new Date(item.endedAt) : null);
    case 'late':
      return item.late === null ? '' : item.late ? 'Sí' : 'No';
    case 'waitMinutes':
      return item.waitMinutes ?? '';
    case 'serviceMinutes':
      return item.serviceMinutes ?? '';
    default:
      return item[column] as string;
  }
}

/** Construye el CSV completo: todas las filas filtradas y solo las columnas pedidas. */
export function buildCsv(columns: ReportColumn[], items: ReportItem[]) {
  const header = columns.map((column) => csvCell(REPORT_COLUMNS[column])).join(',');
  const lines = items.map((item) =>
    columns.map((column) => csvCell(csvValue(column, item))).join(','),
  );
  return [header, ...lines].join('\r\n') + '\r\n';
}

@Injectable()
export class ReportsAdminService {
  constructor(private readonly db: DatabaseService) {}

  private filters(admin: AdminContext, query: Record<string, unknown>) {
    const from = optionalDate(query.from, 'from');
    const to = optionalDate(query.to, 'to');
    if (!from || !to)
      throw fieldFailure({
        from: 'Indica el periodo completo del reporte.',
        to: 'Indica el periodo completo del reporte.',
      });
    const range = assertDateRange(from, to);
    const branchId = optionalUuid(query.branchId, 'branchId');
    if (branchId) assertBranchScope(admin, branchId);
    const status = optionalText(query.status, 'status', 100);
    const procedureId = optionalUuid(query.procedureId, 'procedureId');
    const municipalityCode = optionalText(query.municipalityCode, 'municipalityCode', 5);
    if (municipalityCode && !/^07\d{3}$/.test(municipalityCode))
      throw fieldFailure({ municipalityCode: 'Escribe una clave de municipio válida.' });
    const type = optionalText(query.type, 'type', 10);
    if (type && !['VUGE', 'VIM'].includes(type))
      throw fieldFailure({ type: 'Selecciona VUGE o VIM.' });
    const where: Prisma.AppointmentWhereInput = {
      scheduledAt: { gte: range.start, lte: range.end },
      ...(admin.allBranches ? {} : { branchId: { in: admin.branchIds } }),
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(procedureId ? { procedureId } : {}),
      ...(municipalityCode || type
        ? {
            slot: {
              branch: {
                ...(municipalityCode ? { municipality: { code: municipalityCode } } : {}),
                ...(type ? { type } : {}),
              },
            },
          }
        : {}),
    };
    return { from, to, where };
  }

  private columns(query: Record<string, unknown>): ReportColumn[] {
    const raw = optionalText(query.columns, 'columns', 400);
    if (!raw) return DEFAULT_REPORT_COLUMNS;
    const requested = raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!requested.length || requested.some((value) => !(value in REPORT_COLUMNS)))
      throw fieldFailure({ columns: 'Selecciona columnas válidas del reporte.' });
    return requested as ReportColumn[];
  }

  async report(admin: AdminContext, query: Record<string, unknown>) {
    const { where } = this.filters(admin, query);
    const { page, pageSize, skip, take } = pageParams(query);
    const [lean, rows, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        select: {
          citizenId: true,
          attendance: { select: { arrivedAt: true, startedAt: true, endedAt: true, late: true } },
        },
      }),
      this.db.appointment.findMany({
        where,
        select: reportRowSelect,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take,
      }),
      this.db.appointment.count({ where }),
    ]);
    return {
      summary: summarize(lean),
      items: rows.map(present),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async exportCsv(admin: AdminContext, query: Record<string, unknown>) {
    const { from, to, where } = this.filters(admin, query);
    const columns = this.columns(query);
    const rows = await this.db.appointment.findMany({
      where,
      select: reportRowSelect,
      orderBy: { scheduledAt: 'asc' },
    });
    return {
      filename: `reporte_${from}_${to}.csv`,
      body: buildCsv(columns, rows.map(present)),
    };
  }
}
