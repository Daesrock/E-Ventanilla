/** Sesión administrativa: permisos y alcance suministrados por API, nunca credenciales en navegador. */
import { createContext, useContext } from 'react';
import type { AdminMe } from '../../services/api/admin';

export interface AdminSession {
  identity: AdminMe | null;
  loading: boolean;
  error: string;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}
export const AdminContext = createContext<AdminSession | null>(null);
export function useAdminSession() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('Se requiere AdminProvider.');
  return context;
}
export const pagePermission: Record<string, string> = {
  '/sedes': 'branch.read',
  '/tramites': 'procedure.read',
  '/disponibilidad': 'slot.read',
  '/usuarios': 'staff.read',
  '/citas': 'appointment.read',
  '/reportes': 'report.read',
};
