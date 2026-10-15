/** Catálogo público real por BFF con respaldo ficticio identificado si falla conexión. */
import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api/client';
import { useDemo } from '../app/providers/demo-context';

export function useMunicipalities() {
  const { db } = useDemo();
  const [catalog, setCatalog] = useState<{ code: string; name: string }[]>([]);
  const [status, setStatus] = useState<'loading' | 'real' | 'fallback'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ municipalities: { code: string; name: string }[] }>('catalog/municipalities', {
      signal: controller.signal,
    })
      .then((result) => {
        if (
          !Array.isArray(result.municipalities) ||
          !result.municipalities.every(
            (item) => typeof item.code === 'string' && typeof item.name === 'string',
          )
        )
          throw new Error('Formato de catálogo inesperado.');
        setCatalog(result.municipalities);
        setStatus('real');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('fallback');
      });
    return () => controller.abort();
  }, []);
  const fallback = Array.from(
    new Map(
      db.branches.map((branch) => [
        branch.municipalityCode,
        { code: branch.municipalityCode, name: branch.municipality },
      ]),
    ).values(),
  );
  return { municipalities: status === 'real' ? catalog : fallback, status };
}
