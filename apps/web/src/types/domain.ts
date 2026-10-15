/**
 * Contratos del prototipo. Se inspiran en el esquema recibido, pero no constituyen
 * DTO de API. Fechas de citas incluyen offset; fechas de cupos usan YYYY-MM-DD.
 */
export type Role = 'ROOT' | 'DEPARTMENT_HEAD' | 'COUNTER_HEAD';
export type BranchType = 'VUGE' | 'VIM';
export type AppointmentStatus = 'SCHEDULED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  municipality: string;
  municipalityCode: string;
  address: string;
  phone: string;
  counterHeadId: string | null;
  active: boolean;
  published: boolean;
}

export interface Procedure {
  id: string;
  name: string;
  category: string;
  description: string;
  requirements: string;
  cost: number;
  estimatedMinutes: number;
  active: boolean;
  published: boolean;
}

export interface BranchProcedure {
  branchId: string;
  procedureId: string;
  active: boolean;
}

export interface TimeSlot {
  id: string;
  branchId: string;
  date: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  occupied: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  folio: string;
  citizenId: string;
  citizenName: string;
  branchId: string;
  procedureId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  arrivedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  finalStatus: string | null;
}

export interface DemoDatabase {
  version: 1;
  referenceDate: string;
  users: StaffUser[];
  branches: Branch[];
  procedures: Procedure[];
  branchProcedures: BranchProcedure[];
  slots: TimeSlot[];
  appointments: Appointment[];
}

export interface ReportFilters {
  from: string;
  to: string;
  municipality: string;
  branchType: string;
  branchId: string;
  procedureId: string;
  status: string;
}

export interface ReportMetrics {
  appointments: number;
  citizens: number;
  arrivals: number;
  completed: number;
  cancelled: number;
  noShows: number;
  meanWaitMinutes: number | null;
  meanAttentionMinutes: number | null;
}
