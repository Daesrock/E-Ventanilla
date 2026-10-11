import { readFileSync, writeFileSync, mkdtempSync, rmSync, statSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const mode = process.env.BACKUP_MODE || 'daily';
if (!['daily', 'before-migration'].includes(mode)) throw new Error('Modo de respaldo inválido.');
const remote = process.env.BACKUP_REMOTE || 'crypt:eventanilla';
if (!/^crypt:[a-zA-Z0-9/_-]+$/.test(remote)) throw new Error('El respaldo debe usar el destino cifrado crypt.');
const dir = mkdtempSync(join(tmpdir(), 'eventanilla-backup-'));
const password = readFileSync('/run/secrets/backup_password', 'utf8').trim();
const config = '/run/secrets/rclone_config';
const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
const destination = `${remote}/${mode}/${timestamp}`;
function run(args, options = {}) {
  const result = Bun.spawnSync(args, { stdout: 'pipe', stderr: 'pipe', ...options });
  if (result.exitCode !== 0) throw new Error(`Falló ${args[0]}; no se imprimen credenciales ni contenido de la base.`);
  return result.stdout.toString();
}
const rclone = (...args) => run(['rclone', '--config', config, ...args]);
try {
  const dump = join(dir, 'database.dump');
  writeFileSync(dump, '', { mode: 0o600 });
  run(['pg_dump', '-Fc', '--no-owner', '--no-acl', '--host', 'database', '--username', 'eventanilla_backup', '--dbname', 'eventanilla', '--file', dump], { env: { ...process.env, PGPASSWORD: password } });
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(dump)) digest.update(chunk);
  const manifest = { timestamp: new Date().toISOString(), mode, sha256: digest.digest('hex'), bytes: statSync(dump).size, database: 'eventanilla', format: 'pg_dump-custom', postgresMajor: 18 };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest), { mode: 0o600 });
  rclone('copy', dir, destination);
  rclone('copyto', `${destination}/manifest.json`, join(dir, 'read-back.json'));
  if (readFileSync(join(dir, 'read-back.json'), 'utf8') !== JSON.stringify(manifest)) throw new Error('No se pudo verificar el manifiesto remoto.');
  writeFileSync(join(dir, 'complete.json'), JSON.stringify(manifest), { mode: 0o600 });
  rclone('copyto', join(dir, 'complete.json'), `${destination}/complete.json`);
  rclone('copyto', `${destination}/complete.json`, join(dir, 'complete-read-back.json'));
  if (readFileSync(join(dir, 'complete-read-back.json'), 'utf8') !== JSON.stringify(manifest)) throw new Error('No se pudo confirmar la copia terminada.');
  if (mode === 'daily') {
    const directories = rclone('lsf', `${remote}/daily`, '--dirs-only').trim().split('\n').map(x => x.trim()).filter(x => /^\d{8}T\d{9}Z\/$/.test(x)).sort();
    const completed = [];
    for (const name of directories) {
      try {
        const marker = JSON.parse(rclone('cat', `${remote}/daily/${name}complete.json`));
        if (marker.format === 'pg_dump-custom' && /^[a-f0-9]{64}$/.test(marker.sha256) && Number.isSafeInteger(marker.bytes)) completed.push(name);
      } catch { /* Una subida incompleta nunca desplaza a una copia terminada. */ }
    }
    // Retener las 14 copias exitosas más recientes; una ejecución omitida no elimina la última copia.
    for (const old of completed.slice(0, -14)) rclone('purge', `${remote}/daily/${old}`);
  }
  writeFileSync('/status/last-success.json', JSON.stringify({ ...manifest, destination }), { mode: 0o600 });
  console.log(JSON.stringify({ status: 'ok', timestamp: manifest.timestamp, bytes: manifest.bytes, sha256: manifest.sha256 }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', timestamp: new Date().toISOString(), message: error.message }));
  process.exitCode = 1;
} finally { rmSync(dir, { recursive: true, force: true }); }
