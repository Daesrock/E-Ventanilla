/**
 * Cliente del BFF de mismo origen. Los tokens reales permanecen en servidor;
 * errores se transforman en mensajes sin registrar cuerpos ni credenciales.
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/bff/${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
  } | null;
  if (!response.ok)
    throw new Error(
      body?.message ?? `No se pudo completar la solicitud (HTTP ${response.status}).`,
    );
  return body as T;
}
