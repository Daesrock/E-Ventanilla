/**
 * BFF con rutas permitidas explícitamente: GET públicos y sesiones existentes.
 * Verifica origen en POST, mantiene token en memoria y nunca expone CRUD ficticio
 * como API real. Fetch y store inyectables permiten pruebas sin tocar el VPS.
 */
import express, { type Request, type Response } from 'express';
import type { ServerConfig } from './config';
import { SessionStore } from './session-store';

const COOKIE = 'eventanilla_api_session';
const publicPaths = ['health', 'ready', 'catalog/status', 'catalog/municipalities'];
const publicUserKeys = [
  'id',
  'firstName',
  'lastName',
  'paternalLastName',
  'maternalLastName',
  'email',
  'emailVerifiedAt',
  'active',
];

function sessionId(req: Request): string | undefined {
  const entry = req.headers.cookie
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE}=`));
  const id = entry?.slice(COOKIE.length + 1);
  return id && /^[a-f0-9]{64}$/.test(id) ? id : undefined;
}
function publicUser(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const source = input as Record<string, unknown>;
  return Object.fromEntries(
    publicUserKeys.filter((key) => key in source).map((key) => [key, source[key]]),
  );
}

export function createApp(
  config: ServerConfig,
  upstreamFetch: typeof fetch = fetch,
  store = new SessionStore(),
) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/bff', (_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    next();
  });
  app.use('/bff', (req, res, next) => {
    if (
      !['GET', 'HEAD'].includes(req.method) &&
      (req.get('Origin') !== config.appOrigin || req.get('Sec-Fetch-Site') === 'cross-site')
    ) {
      res.status(403).json({ message: 'Origen de solicitud no permitido.' });
      return;
    }
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  const cookieOptions = {
    httpOnly: true,
    secure: config.production,
    sameSite: 'strict' as const,
    path: '/bff/auth',
  };
  const clearSession = (req: Request, res: Response) => {
    store.delete(sessionId(req));
    res.clearCookie(COOKIE, cookieOptions);
  };
  const upstream = async (path: string, options: RequestInit = {}) => {
    const response = await upstreamFetch(new URL(path, config.apiBaseUrl), {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    const body: unknown = await response.json().catch(() => null);
    return { response, body };
  };
  const upstreamError = (res: Response, status: number) => {
    const messages: Record<number, string> = {
      400: 'La API rechazó los campos enviados.',
      401: 'Credenciales o sesión no válidas.',
      403: 'La API no permite esta operación para la cuenta.',
      429: 'Demasiadas solicitudes. Espera antes de reintentar.',
    };
    res
      .status(status >= 400 && status <= 599 ? status : 502)
      .json({ message: messages[status] ?? `La API respondió HTTP ${status}.` });
  };
  for (const path of publicPaths)
    app.get(`/bff/${path}`, async (_req, res) => {
      try {
        const result = await upstream(path);
        if (!result.response.ok) {
          upstreamError(res, result.response.status);
          return;
        }
        res.json(result.body);
      } catch {
        res.status(502).json({
          message: 'No se pudo consultar la API. Revisa conectividad y configuración del BFF.',
        });
      }
    });

  const attempts = new Map<string, { count: number; until: number }>();
  app.post('/bff/auth/login', async (req, res) => {
    for (const [key, value] of attempts) if (value.until <= Date.now()) attempts.delete(key);
    const key = req.ip ?? 'unknown';
    const current = attempts.get(key) ?? { count: 0, until: Date.now() + 5 * 60_000 };
    if (current.count >= 8 || (attempts.size >= 2000 && !attempts.has(key))) {
      res.status(429).json({ message: 'Espera unos minutos antes de intentar de nuevo.' });
      return;
    }
    current.count++;
    attempts.set(key, current);
    const { identifier, password } = req.body ?? {};
    if (
      typeof identifier !== 'string' ||
      !identifier.trim() ||
      identifier.length > 320 ||
      typeof password !== 'string' ||
      !password ||
      password.length > 1024
    ) {
      res.status(400).json({ message: 'Introduce identificador y contraseña válidos.' });
      return;
    }
    try {
      const result = await upstream('auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      if (!result.response.ok) {
        upstreamError(res, result.response.status);
        return;
      }
      const body = result.body as { token?: unknown; expiresAt?: unknown; user?: unknown } | null;
      if (!body || typeof body.token !== 'string' || typeof body.expiresAt !== 'string') {
        res.status(502).json({ message: 'La API devolvió un contrato de sesión inesperado.' });
        return;
      }
      const expiresAt = Date.parse(body.expiresAt);
      const id = store.create(body.token, expiresAt);
      store.delete(sessionId(req));
      res.cookie(COOKIE, id, { ...cookieOptions, expires: new Date(expiresAt) });
      res.json({
        user: publicUser(body.user),
        expiresAt: body.expiresAt,
        administrativeAccess: false,
      });
    } catch {
      res.status(502).json({ message: 'No se pudo establecer una sesión con la API.' });
    }
  });
  app.get('/bff/auth/me', async (req, res) => {
    const session = store.get(sessionId(req));
    if (!session) {
      clearSession(req, res);
      res.status(401).json({ message: 'No hay una sesión API activa.' });
      return;
    }
    try {
      const result = await upstream('auth/me', {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!result.response.ok) {
        if ([401, 403].includes(result.response.status)) clearSession(req, res);
        upstreamError(res, result.response.status);
        return;
      }
      const body = result.body as { user?: unknown } | null;
      res.json({
        user: publicUser(body?.user ?? body),
        expiresAt: new Date(session.expiresAt).toISOString(),
        administrativeAccess: false,
      });
    } catch {
      res.status(502).json({ message: 'No se pudo verificar la sesión API.' });
    }
  });
  app.post('/bff/auth/logout', async (req, res) => {
    const session = store.get(sessionId(req));
    if (!session) {
      clearSession(req, res);
      res.json({ message: 'Sesión web cerrada.' });
      return;
    }
    try {
      const result = await upstream('auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      clearSession(req, res);
      if (!result.response.ok && result.response.status !== 401) {
        res
          .status(502)
          .json({ message: 'Sesión web cerrada. La API no confirmó la revocación remota.' });
        return;
      }
      res.json({ message: 'Sesión API revocada y sesión web cerrada.' });
    } catch {
      clearSession(req, res);
      res
        .status(502)
        .json({ message: 'Sesión web cerrada. No se pudo confirmar revocación en la API.' });
    }
  });
  app.use('/bff', (_req, res) =>
    res.status(404).json({ message: 'Endpoint no disponible en este prototipo.' }),
  );
  app.use(
    (
      error: Error & { status?: number },
      _req: Request,
      res: Response,
      next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      res
        .status(error.status === 413 ? 413 : 400)
        .json({ message: 'Cuerpo de solicitud inválido o demasiado grande.' });
    },
  );
  return app;
}
