import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = process.env.POSTGRES_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const result = spawnSync(resolve(bin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'), ['-D', resolve(root, '.tools/postgres-data'), '-m', 'fast', '-w', 'stop'], { windowsHide: true, stdio: 'inherit' });
process.exitCode = result.status || 0;
