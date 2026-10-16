/** Consultas cancelables y aviso de salida con cambios pendientes del panel administrativo. */
import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { adminGet } from '../../services/api/admin';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function useAdminQuery<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    error?: string;
    version: number;
  }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    adminGet<T>(path, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data, version });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setResult({
            path,
            error: cause instanceof Error ? cause.message : 'No se pudo consultar.',
            version,
          });
      });
    return () => controller.abort();
  }, [path, version]);
  const current = result?.path === path && result.version === version ? result : undefined;
  return {
    data: current?.data,
    error: current?.error,
    loading: !!path && !current,
    reload: () => setVersion((value) => value + 1),
  };
}
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  return blocker.state === 'blocked' ? (
    <Modal title="Cambios sin guardar" onClose={() => blocker.reset()}>
      <p>Si sales, se descartarán los cambios pendientes.</p>
      <div className="form-actions">
        <Button variant="secondary" onClick={() => blocker.reset()}>
          Seguir editando
        </Button>
        <Button onClick={() => blocker.proceed()}>Descartar y salir</Button>
      </div>
    </Modal>
  ) : null;
}
