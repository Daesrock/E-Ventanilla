import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { environmentSecret } from '../dist/core/configuration/environment.js';

test('secretos por archivo conservan espacios, rechazan doble configuración y no filtran rutas', () => {
  const name = 'EV_TEST_SECRET';
  const dir = mkdtempSync(join(tmpdir(), 'eventanilla-secret-'));
  const path = join(dir, 'credential');
  try {
    delete process.env[name];
    writeFileSync(path, '  secreto técnico  \n');
    process.env[`${name}_FILE`] = path;
    assert.equal(environmentSecret(name), '  secreto técnico  ');
    process.env[name] = 'otro';
    assert.throws(() => environmentSecret(name), /Configura solo/);
    delete process.env[name];
    process.env[`${name}_FILE`] = join(dir, 'missing');
    assert.throws(
      () => environmentSecret(name),
      (error) => !error.message.includes(dir) && /No fue posible leer/.test(error.message),
    );
  } finally {
    delete process.env[name];
    delete process.env[`${name}_FILE`];
    rmSync(dir, { recursive: true });
  }
});
