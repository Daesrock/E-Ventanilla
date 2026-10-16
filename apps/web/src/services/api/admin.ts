/** Contratos del API administrativo desplegado: decimales y nulos se conservan sin inventar datos. */
import { apiRequest, ApiError } from './client';
import type { Role } from '../../types/domain';

export interface AdminMe {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    emailVerifiedAt: string | null;
  };
  role: { code: Role; name: string; hierarchyLevel: number | null };
  permissions: string[];
  scope: { allBranches: boolean; branches: { id: string; name: string }[] };
  profiles: { counterStaff: boolean; counterHead: boolean; departmentHead: boolean };
}
export interface Publication {
  published: boolean;
  active: boolean;
  sourceKey: string | null;
  sourceUrl: string | null;
  sourceSha256: string | null;
  sourceCheckedAt: string | null;
}
export interface AdminBranch extends Publication {
  id: string;
  name: string;
  type: string;
  municipality: { code: string; name: string };
  address: string | null;
  phone: string | null;
  email: string | null;
  officeHours: string | null;
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  counterHeadId: string | null;
  counterHead: { id: string; name: string; active: boolean } | null;
}
export interface AdminProcedure extends Publication {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  requirements: string | null;
  cost: string | null;
  estimatedMinutes: number | null;
}
export interface AdminOffer {
  procedureId: string;
  name: string;
  category: string | null;
  cost: string | null;
  procedureActive: boolean;
  procedurePublished: boolean;
  active: boolean;
}
export interface AdminStaff {
  id: string;
  name: string;
  email: string;
  curp: string;
  active: boolean;
  phone: string | null;
  role: { code: string; name: string };
  profiles: AdminMe['profiles'];
  branches: { id: string; name: string }[];
}
export interface AdminSlot {
  id: string;
  branchId: string;
  date: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  occupied: number;
  active: boolean;
}
export interface AdminAppointment {
  id: string;
  folio: string;
  status: string;
  scheduledAt: string;
  branch: { id: string; name: string };
  procedure: { id: string; name: string };
  citizen: { name: string };
  attendance: {
    arrivedAt: string;
    startedAt: string | null;
    endedAt: string | null;
    late: boolean;
  } | null;
}
export interface Page<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface ReportItem {
  folio: string;
  scheduledAt: string;
  branch: string;
  municipality: string;
  procedure: string;
  citizen: string;
  status: string;
  arrivedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  late: boolean | null;
  waitMinutes: number | null;
  serviceMinutes: number | null;
}
export interface AdminReport extends Page<ReportItem> {
  summary: {
    appointments: number;
    citizens: number;
    attended: number;
    completed: number;
    late: number;
    averageWaitMinutes: number | null;
    averageServiceMinutes: number | null;
  };
}
export const adminMe = () => apiRequest<AdminMe>('admin/me');
export const adminGet = <T>(path: string, signal?: AbortSignal) =>
  apiRequest<T>(`admin/${path}`, { signal });
export const adminWrite = <T>(path: string, method: 'POST' | 'PATCH', body: unknown) =>
  apiRequest<T>(`admin/${path}`, { method, body: JSON.stringify(body) });
export const queryString = (values: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(values)
      .filter(([, value]) => value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();
export const price = (cost: string | null) =>
  cost === null
    ? 'Costo por confirmar'
    : Number(cost) === 0
      ? 'Sin costo'
      : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(cost));
export async function allStaff(signal?: AbortSignal) {
  const first = await adminGet<Page<AdminStaff>>('staff?pageSize=100', signal);
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page++) {
    items.push(
      ...(await adminGet<Page<AdminStaff>>(`staff?pageSize=100&page=${page}`, signal)).items,
    );
  }
  return items;
}
export async function downloadReport(query: string) {
  const response = await fetch(`/bff/admin/reports/export.csv?${query}`, {
    credentials: 'same-origin',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.message ?? 'No se pudo exportar.',
      response.status,
      body.code,
      body.fieldErrors,
    );
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
