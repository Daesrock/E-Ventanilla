import '../apps/api/check-bun.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL(process.argv[2] || 'https://api-ventanilla.daesrock.dev/v1/');
assert.ok(['http:', 'https:'].includes(base.protocol) && base.pathname.endsWith('/'), 'La URL debe terminar con /');
assert.ok(!base.username && !base.password && !base.search && !base.hash, 'La URL no debe incluir credenciales ni tokens');
const local = JSON.parse(await readFile(new URL('../apps/api/resources/municipalities.json', import.meta.url), 'utf8'));
let failures = 0;
for (const [path, expected] of [
  ['health', 200], ['ready', 200], ['catalog/municipalities', 200],
  ['auth/me', 401], ['auth/verification-status', 401], ['auth/verification-context', 401], ['auth/appointment-access', 401],
]) {
  try {
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000), redirect: 'error' });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    if (path === 'catalog/municipalities') {
      const json = await response.json();
      assert.deepEqual(json.municipalities, local.municipalities);
      assert.deepEqual(json.metadata, local.metadata);
    }
    console.log(`OK ${path}: HTTP ${expected}`);
  } catch {
    failures++;
    console.error(`FALLO ${path}: no respondió con HTTP ${expected}, cabeceras o catálogo esperados.`);
  }
}
console.log('Solo se ejecutaron consultas GET, sin cuentas, credenciales ni envíos de correo.');
process.exitCode = failures ? 1 : 0;
