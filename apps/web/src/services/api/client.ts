/**
 * Cliente del BFF de mismo origen. Los tokens reales permanecen en servidor;
 * errores se transforman en mensajes sin registrar cuerpos ni credenciales.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}
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
    code?: string;
    fieldErrors?: Record<string, string>;
  } | null;
  if (
    response.status === 401 &&
    path.startsWith('admin/') &&
    path !== 'admin/me' &&
    typeof window !== 'undefined'
  )
    window.dispatchEvent(new Event('admin-session-expired'));
  if (!response.ok)
    throw new ApiError(
      body?.message ?? `No se pudo completar la solicitud (HTTP ${response.status}).`,
      response.status,
      body?.code,
      body?.fieldErrors,
    );
  return body as T;
}
