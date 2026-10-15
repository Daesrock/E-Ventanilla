/** Contrato del contexto local separado del proveedor para permitir recarga rápida. */
import { createContext, useContext } from 'react';
import type { DemoDatabase, StaffUser } from '../../types/domain';
import type { DemoCommand } from '../../mocks/commands';

export interface DemoContextValue {
  db: DemoDatabase;
  user: StaffUser | null;
  storageWarning: string;
  login: (id: string) => void;
  logout: () => void;
  execute: (command: DemoCommand) => void;
  reset: () => void;
}

export const DemoContext = createContext<DemoContextValue | null>(null);

/** Acceso al almacén; falla explícitamente si el consumidor está fuera del proveedor. */
export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo requiere DemoProvider.');
  return value;
}
