import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import './check-bun.mjs';

const result = Bun.spawnSync(['bun', 'run', 'db:migrate'], {
  stdout: 'inherit',
  stderr: 'inherit',
});
if (result.exitCode) process.exit(result.exitCode);
const file = process.env.DATABASE_URL_FILE;
const connectionString = file
  ? readFileSync(file, 'utf8').replace(/\r?\n$/, '')
  : process.env.DATABASE_URL;
const db = new Client({ connectionString });
try {
  await db.connect();
  await db.query('BEGIN');
  await db.query(
    readFileSync(new URL('../../database/permissions/runtime.sql', import.meta.url), 'utf8'),
  );
  await db.query('COMMIT');
  console.log('Migraciones y permisos de API y respaldos aplicados.');
} catch {
  console.error('No se pudieron aplicar los permisos del despliegue.');
  process.exitCode = 1;
} finally {
  await db.end();
}
