// JSON privado por archivo; las credenciales nunca se reciben en argumentos ni se imprimen.
import '../apps/api/check-bun.mjs';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

async function main() {
  if (process.argv.length !== 3)
    throw new Error(
      'Indica únicamente la ruta del JSON privado con los datos corroborados del titular.',
    );
  let input;
  try {
    const path = resolve(process.argv[2]);
    const file = statSync(path);
    if (
      !file.isFile() ||
      file.size > 32768 ||
      (process.platform !== 'win32' && (file.mode & 0o077) !== 0)
    )
      throw new Error('Archivo no privado.');
    input = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    // JSON.parse puede incluir fragmentos de la entrada en su mensaje: no propagarlos.
    throw new Error('No se pudo leer un JSON privado válido. En Linux usa permisos 0600.');
  }
  const api = new URL('../apps/api/', import.meta.url);
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_FILE) {
    const env = fileURLToPath(new URL('.env', api));
    if (existsSync(env)) process.loadEnvFile(env);
  }
  const require = createRequire(new URL('package.json', api));
  require('reflect-metadata');
  const { environmentSecret } = await import('../apps/api/dist/core/configuration/environment.js');
  const connectionString = environmentSecret('DATABASE_URL');
  if (!/^postgres(?:ql)?:\/\//.test(connectionString))
    throw new Error('Configura DATABASE_URL o DATABASE_URL_FILE de la base de destino autorizada.');
  const { PrismaClient } = await import('../apps/api/dist/generated/prisma/client.js');
  const { provisionRoot } = await import('../apps/api/dist/features/admin/root-provisioning.js');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await provisionRoot(db, input);
    console.info('Cuenta ROOT inicial aprovisionada con auditoría.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  if (typeof error.getResponse === 'function') {
    const response = error.getResponse();
    const fields = typeof response === 'object' && response?.fieldErrors;
    console.error(
      fields
        ? `Revisa los campos: ${Object.keys(fields).join(', ')}.`
        : typeof response === 'object' && typeof response.message === 'string'
          ? response.message
          : 'No se pudo crear la cuenta inicial.',
    );
  } else if (error.code || error.name === 'PrismaClientInitializationError') {
    console.error(
      'No se pudo aprovisionar ROOT. Revisa conexión, migraciones y permisos; no se modificaron cuentas existentes.',
    );
  } else {
    // Solo mensajes definidos en este script; nunca detalles de entrada o del servidor SQL.
    console.error(
      'No se pudo completar el aprovisionamiento. Comprueba el archivo privado, Bun 1.4.2 y la conexión configurada.',
    );
  }
  process.exitCode = 1;
});
