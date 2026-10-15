/** Arranque del BFF; en producción sirve dist y permite recargar rutas de React Router. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app';
import { loadConfig } from './config';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
const config = loadConfig();
const app = createApp(config);
if (config.production) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  app.use(express.static(dist));
  app.get(/^(?!\/bff(?:\/|$)).*/, (_req, res) => res.sendFile(`${dist}/index.html`));
}
const server = app.listen(config.port, '127.0.0.1', () =>
  console.info(`BFF E-Ventanilla disponible en http://127.0.0.1:${config.port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
