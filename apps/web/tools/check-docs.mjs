/**
 * Verifica inventario de documentación por archivo y encabezados de código autorado.
 * Excluye dependencias, compilación, resultados y .env privados. No modifica archivos.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', 'coverage']);
const map = await readFile(join(root, 'docs/file-map.md'), 'utf8');
const files = [];
async function walk(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      ignored.has(entry.name) ||
      entry.name.endsWith('.log') ||
      entry.name.endsWith('.tsbuildinfo') ||
      (entry.name.startsWith('.env') && entry.name !== '.env.example')
    )
      continue;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await walk(join(directory, entry.name), `${relative}/`);
    else files.push(relative);
  }
}
await walk(root);
const missing = files.filter((file) => !map.includes(`\`${file}\``));
const noHeader = [];
for (const file of files.filter((file) => /\.(tsx?|m?js)$/.test(file))) {
  if (!(await readFile(join(root, file), 'utf8')).trimStart().startsWith('/**'))
    noHeader.push(file);
}
if (missing.length || noHeader.length) {
  console.error('Faltan entradas en file-map:', missing);
  console.error('Faltan encabezados de responsabilidad:', noHeader);
  process.exitCode = 1;
} else
  console.info(
    `${files.length} archivos documentados; todos los archivos de código tienen encabezado.`,
  );
