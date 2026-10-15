/**
 * Alcance demostrativo de perfiles. No sustituye guards ni permisos de la API.
 * Funciones puras reutilizadas por navegación, filtros y comandos del prototipo.
 */
import type { Branch, Role, StaffUser } from '../../types/domain';

export const roleLabels: Record<Role, string> = {
  ROOT: 'Root · configuración inicial',
  DEPARTMENT_HEAD: 'Jefe de departamento',
  COUNTER_HEAD: 'Jefe de ventanilla',
};

export const canManageCatalog = (user: StaffUser) => user.active && user.role !== 'COUNTER_HEAD';
export const canCreateUsers = (user: StaffUser) => user.active && user.role === 'ROOT';
export const canAssignHeads = (user: StaffUser) => user.active && user.role !== 'COUNTER_HEAD';

/** Filtra sedes por responsable; nunca concede alcance a una cuenta inactiva. */
export function scopedBranches(branches: Branch[], user: StaffUser): Branch[] {
  if (!user.active) return [];
  return user.role === 'COUNTER_HEAD'
    ? branches.filter((branch) => branch.counterHeadId === user.id)
    : branches;
}

export function canAccessBranch(branch: Branch, user: StaffUser): boolean {
  return user.active && (user.role !== 'COUNTER_HEAD' || branch.counterHeadId === user.id);
}
