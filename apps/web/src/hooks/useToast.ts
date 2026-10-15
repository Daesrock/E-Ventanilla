/** Contrato de notificaciones y hook; no contiene estado de dominio ni sesiones. */
import { createContext, useContext } from 'react';

export const ToastContext = createContext<
  ((message: string, tone?: 'success' | 'error') => void) | null
>(null);
export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast requiere ToastProvider.');
  return notify;
}
