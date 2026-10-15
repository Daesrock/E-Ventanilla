/**
 * Persistencia exclusiva de datos ficticios y perfil de demostración. Nunca almacena
 * contraseñas ni tokens API. Los comandos validan permisos antes de guardar cambios.
 */
import { useRef, useState, type ReactNode } from 'react';
import { DemoContext } from './demo-context';
import { createSeed } from '../../mocks/seed';
import { applyCommand, type DemoCommand } from '../../mocks/commands';
import type { DemoDatabase } from '../../types/domain';

const DATA_KEY = 'eventanilla.demo.data.v1';
const PROFILE_KEY = 'eventanilla.demo.profile.v1';

function readDatabase(): DemoDatabase {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) ?? 'null') as DemoDatabase | null;
    if (
      parsed?.version === 1 &&
      typeof parsed.referenceDate === 'string' &&
      ['users', 'branches', 'procedures', 'branchProcedures', 'slots', 'appointments'].every(
        (key) => Array.isArray(parsed[key as keyof DemoDatabase]),
      )
    )
      return parsed;
  } catch {
    /* Una copia local dañada se reemplaza por una nueva demostración. */
  }
  return createSeed();
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState(readDatabase);
  const currentDb = useRef(db);
  const [profileId, setProfileId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(PROFILE_KEY);
    } catch {
      return null;
    }
  });
  const [storageWarning, setStorageWarning] = useState('');
  const user = db.users.find((item) => item.id === profileId && item.active) ?? null;

  const persist = (next: DemoDatabase) => {
    currentDb.current = next;
    setDb(next);
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(next));
      setStorageWarning('');
    } catch {
      setStorageWarning(
        'El navegador no permite guardar cambios locales. Esta sesión funciona, pero los cambios se perderán al recargar.',
      );
    }
  };
  const login = (id: string) => {
    if (!currentDb.current.users.some((item) => item.id === id && item.active))
      throw new Error('Cuenta demostrativa no disponible.');
    setProfileId(id);
    try {
      sessionStorage.setItem(PROFILE_KEY, id);
    } catch {
      /* Perfil disponible solo durante esta navegación. */
    }
  };
  const logout = () => {
    setProfileId(null);
    try {
      sessionStorage.removeItem(PROFILE_KEY);
    } catch {
      /* No hay sesión real de API en este almacén. */
    }
  };
  const execute = (command: DemoCommand) => {
    if (!user) throw new Error('Selecciona un perfil de demostración.');
    persist(applyCommand(currentDb.current, user, command));
  };
  return (
    <DemoContext.Provider
      value={{
        db,
        user,
        storageWarning,
        login,
        logout,
        execute,
        reset: () => persist(createSeed()),
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
