/**
 * Smoke test opcional y de solo lectura contra API real, a través de un BFF efímero.
 * No autentica cuentas ni ejecuta POST. Imprime disponibilidad y conteo de municipios,
 * nunca credenciales o registros personales. Ejecutar con npm run check:api.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app';
import { loadConfig } from '../server/config';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
const server = createApp(loadConfig()).listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
const { port } = server.address() as AddressInfo;
try {
  for (const path of ['health', 'ready', 'catalog/status', 'catalog/municipalities']) {
    const response = await fetch(`http://127.0.0.1:${port}/bff/${path}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json()) as { status?: string; municipalities?: unknown[] };
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    if (path === 'catalog/municipalities' && !Array.isArray(body.municipalities))
      throw new Error('Contrato de municipios inesperado.');
    console.info(
      `${path}: HTTP ${response.status}${body.municipalities ? ` · ${body.municipalities.length} municipios` : body.status ? ` · ${body.status}` : ''}`,
    );
  }
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
