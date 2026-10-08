import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vars = parseEnv(readFileSync(resolve(root, 'api/.env'), 'utf8'));
const require = createRequire(resolve(root, 'api/package.json'));
const { Client } = require('pg');
const bin = process.env.POSTGRES_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const dir = resolve(root, '.tools/postgres-data');
const passwordFile = resolve(root, '.tools/postgres-password.txt');
const exe = name => resolve(bin, process.platform === 'win32' ? `${name}.exe` : name);
const url = new URL(vars.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432') {
  throw new Error('Este script solo administra la base aislada local en el puerto 55432.');
}
if (!existsSync(exe('pg_ctl'))) throw new Error('Indica POSTGRES_BIN con la carpeta bin de PostgreSQL.');
mkdirSync(resolve(root, '.tools'), { recursive: true });

function run(name, args, allowFailure = false) {
  const result = spawnSync(exe(name), args, { windowsHide: true, stdio: 'ignore', env: { ...process.env, PGPASSWORD: vars.POSTGRES_PASSWORD } });
  if (result.status !== 0 && !allowFailure) throw new Error(`No se pudo ejecutar ${name}. Revisa .tools/postgres.log.`);
  return result;
}

if (!existsSync(resolve(dir, 'PG_VERSION'))) {
  writeFileSync(passwordFile, `${vars.POSTGRES_PASSWORD}\n`, { mode: 0o600 });
  run('initdb', ['-D', dir, '-U', vars.POSTGRES_USER, '--pwfile', passwordFile, '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C']);
}
const probe = new Client({ connectionString: new URL('postgres', url).href, connectionTimeoutMillis: 2000 });
let running = false;
try { await probe.connect(); running = true; } catch {} finally { await probe.end().catch(() => {}); }
if (!running) {
  run('pg_ctl', ['-D', dir, '-l', resolve(root, '.tools/postgres.log'), '-o', '-h 127.0.0.1 -p 55432', '-w', 'start']);
}
const client = new Client({ connectionString: new URL('postgres', url).href });
await client.connect();
try {
  const name = vars.POSTGRES_DB;
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Nombre de base local inválido.');
  const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!found.rowCount) await client.query(`CREATE DATABASE "${name}"`);
} finally { await client.end(); }
console.log('Base local del proyecto disponible en 127.0.0.1:55432. Sin cargas de datos institucionales.');
