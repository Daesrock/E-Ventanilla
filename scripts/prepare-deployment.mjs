import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

if (typeof Bun === 'undefined' || Bun.version !== '1.4.2') throw new Error('Usa Bun 1.4.2.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, '.tools/deployment/secrets');
mkdirSync(dir, { recursive: true, mode: 0o700 });
function save(name, value) {
  const path = resolve(dir, name);
  if (!existsSync(path)) writeFileSync(path, `${value}\n`, { mode: 0o600, flag: 'wx' });
  return readFileSync(path, 'utf8').replace(/\r?\n$/, '');
}
for (const name of ['postgres_password', 'migration_password', 'api_password', 'manager_password', 'backup_password', 'pgadmin_password', 'auth_code_secret']) save(name, randomBytes(32).toString('hex'));
const password = name => readFileSync(resolve(dir, name), 'utf8').trim();
save('api_database_url', `postgresql://eventanilla_api:${password('api_password')}@database:5432/eventanilla`);
save('migration_database_url', `postgresql://eventanilla_migrator:${password('migration_password')}@database:5432/eventanilla`);
const local = existsSync(resolve(root, 'apps/api/.env')) ? parseEnv(readFileSync(resolve(root, 'apps/api/.env'), 'utf8')) : {};
save('resend_api_key', local.RESEND_API_KEY || '');
save('resend_from', local.RESEND_FROM || 'E-Ventanilla <notificaciones@daesrock.dev>');
for (const name of ['cloudflared_token', 'rclone.conf']) save(name, '');
console.log('Secretos preparados en .tools/deployment/secrets. No se muestran valores ni se reemplazan secretos existentes.');
