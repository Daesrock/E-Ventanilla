/** Configuración privada validada del BFF. No se importa desde el bundle del navegador. */
export interface ServerConfig {
  apiBaseUrl: string;
  appOrigin: string;
  production: boolean;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const api = new URL(env.API_BASE_URL ?? 'https://api-ventanilla.daesrock.dev/v1/');
  if (
    api.protocol !== 'https:' ||
    !api.pathname.endsWith('/') ||
    api.username ||
    api.password ||
    api.search ||
    api.hash
  )
    throw new Error(
      'API_BASE_URL debe ser HTTPS, terminar con / y no contener credenciales ni parámetros.',
    );
  const production = env.NODE_ENV === 'production';
  const app = new URL(env.APP_ORIGIN ?? 'http://127.0.0.1:5173');
  if (!['http:', 'https:'].includes(app.protocol) || (production && app.protocol !== 'https:'))
    throw new Error('APP_ORIGIN debe ser un origen HTTP local o HTTPS en producción.');
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido.');
  return { apiBaseUrl: api.href, appOrigin: app.origin, production, port };
}
