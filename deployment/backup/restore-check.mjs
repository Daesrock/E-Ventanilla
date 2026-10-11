import { readFileSync, writeFileSync, mkdtempSync, rmSync, createReadStream, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const remote = process.env.BACKUP_REMOTE || 'crypt:eventanilla';
if (!/^crypt:[a-zA-Z0-9/_-]+$/.test(remote)) throw new Error('Destino de respaldo inválido.');
const dir = mkdtempSync(join(tmpdir(), 'eventanilla-restore-'));
const config = '/run/secrets/rclone_config';
const password = readFileSync('/run/secrets/postgres_password', 'utf8').trim();
function run(args, options = {}) {
  const result = Bun.spawnSync(args, { stdout: 'pipe', stderr: 'pipe', ...options });
  if (result.exitCode !== 0) throw new Error(`Falló la etapa ${args[0]}; la restauración permanece aislada.`);
  return result.stdout.toString();
}
const rclone = (...args) => run(['rclone', '--config', config, ...args]);
const sql = statement => run(['psql', '--host', 'restore-db', '--username', 'eventanilla_admin', '--dbname', 'eventanilla', '--set', 'ON_ERROR_STOP=1', '--command', statement], { env: { ...process.env, PGPASSWORD: password } });
try {
  const modes = rclone('lsf', remote, '--dirs-only').split('\n').map(x => x.trim().replace(/\/$/, '')).filter(x => ['daily', 'before-migration'].includes(x));
  const copies = modes.flatMap(mode => {
    const output = rclone('lsf', `${remote}/${mode}`, '--dirs-only');
    return output.split('\n').map(x => x.trim()).filter(x => /^\d{8}T\d{9}Z\/$/.test(x)).map(name => ({ mode, name }));
  }).sort((a, b) => a.name.localeCompare(b.name));
  let latest;
  for (const candidate of copies.toReversed()) {
    try {
      const marker = JSON.parse(rclone('cat', `${remote}/${candidate.mode}/${candidate.name}complete.json`));
      if (marker.format === 'pg_dump-custom' && /^[a-f0-9]{64}$/.test(marker.sha256) && Number.isSafeInteger(marker.bytes)) { latest = candidate; break; }
    } catch { /* Ignorar subidas incompletas. */ }
  }
  if (!latest) throw new Error('No existe una copia válida para restaurar.');
  const source = `${remote}/${latest.mode}/${latest.name}`;
  rclone('copyto', `${source}manifest.json`, join(dir, 'manifest.json'));
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256) || manifest.format !== 'pg_dump-custom' || manifest.postgresMajor !== 18 || !Number.isSafeInteger(manifest.bytes)) throw new Error('Manifiesto inválido.');
  if (rclone('cat', `${source}complete.json`) !== JSON.stringify(manifest)) throw new Error('La confirmación de respaldo y el manifiesto no coinciden.');
  const dump = join(dir, 'database.dump');
  rclone('copyto', `${source}database.dump`, dump);
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(dump)) digest.update(chunk);
  if (digest.digest('hex') !== manifest.sha256 || statSync(dump).size !== manifest.bytes) throw new Error('La copia descargada no supera la comprobación de integridad.');
  // La base de comprobación comienza vacía con los roles y esquemas del proyecto.
  // No se conecta a la red de la base de producción.
  const list = run(['pg_restore', '--list', dump]).split('\n').filter(line => !/\bSCHEMA - public\b/.test(line)).join('\n');
  writeFileSync(join(dir, 'restore.list'), list, { mode: 0o600 });
  run(['pg_restore', '--exit-on-error', '--no-owner', '--no-acl', '--role', 'eventanilla_migrator', '--host', 'restore-db', '--username', 'eventanilla_admin', '--dbname', 'eventanilla', '--use-list', join(dir, 'restore.list'), dump], { env: { ...process.env, PGPASSWORD: password } });
  sql(`BEGIN; SET LOCAL ROLE eventanilla_migrator; ${readFileSync('/work/deploy-permissions.sql', 'utf8')} COMMIT;`);
  sql(readFileSync('/work/check-permissions.sql', 'utf8').replace(/^\\set .*$/gm, ''));
  const report = { status: 'ok', restoredAt: new Date().toISOString(), backupAt: manifest.timestamp, bytes: manifest.bytes, sha256: manifest.sha256, destination: 'isolated-restore-db' };
  writeFileSync('/status/last-restore.json', JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', timestamp: new Date().toISOString(), message: error.message }));
  process.exitCode = 1;
} finally { rmSync(dir, { recursive: true, force: true }); }
