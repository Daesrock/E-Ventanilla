import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

if (typeof Bun === 'undefined' || Bun.version !== '1.4.2') throw new Error('Usa Bun 1.4.2.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.tools/deployment');
mkdirSync(output, { recursive: true });

function git(args) {
  const result = Bun.spawnSync(['git', '-C', root, ...args], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode) throw new Error('No se pudo preparar el código versionado para despliegue.');
  return result.stdout.toString().trim();
}

// Empaquetar exclusivamente un commit: nunca copiar secretos ni archivos locales.
const commit = git(['rev-parse', 'HEAD']);
const archive = join(output, `source-${commit}.tar.gz`);
git(['archive', '--format=tar.gz', '--output', archive, commit]);
const metadata = { commit, archive, sha256: createHash('sha256').update(readFileSync(archive)).digest('hex') };
writeFileSync(join(output, 'latest.json'), JSON.stringify(metadata));
console.log(JSON.stringify(metadata));
