/** Recupera identidad real desde cookie HttpOnly y mantiene separada la demostración. */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AdminContext } from './admin-context';
import { adminMe, type AdminMe } from '../../services/api/admin';
import { apiLogin, apiLogout } from '../../features/auth/auth.service';
import { ApiError } from '../../services/api/client';

export function AdminProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setIdentity(await adminMe());
      setError('');
    } catch (cause) {
      setIdentity(null);
      if (!(cause instanceof ApiError && [401, 403].includes(cause.status)))
        setError(cause instanceof Error ? cause.message : 'No se pudo recuperar la sesión.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    adminMe()
      .then((value) => {
        if (active) setIdentity(value);
      })
      .catch((cause) => {
        if (active && !(cause instanceof ApiError && [401, 403].includes(cause.status)))
          setError(cause instanceof Error ? cause.message : 'No se pudo recuperar la sesión.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const expired = () => {
      setIdentity(null);
      setError('La sesión venció. Ingresa nuevamente.');
    };
    window.addEventListener('admin-session-expired', expired);
    return () => window.removeEventListener('admin-session-expired', expired);
  }, []);
  const signIn = async (identifier: string, password: string) => {
    await apiLogin(identifier, password);
    try {
      setIdentity(await adminMe());
      setError('');
    } catch (cause) {
      await apiLogout().catch(() => {});
      throw cause;
    }
  };
  const signOut = async () => {
    try {
      await apiLogout();
    } finally {
      setIdentity(null);
    }
  };
  return (
    <AdminContext.Provider value={{ identity, loading, error, refresh, signIn, signOut }}>
      {children}
    </AdminContext.Provider>
  );
}
