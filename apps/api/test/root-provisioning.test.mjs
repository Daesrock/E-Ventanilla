import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateRootAccount, provisionRoot } from '../dist/features/admin/root-provisioning.js';

const input = {
  firstName: ' Fixture ',
  paternalLastName: ' Apellido compuesto ',
  curp: 'babb000101hcsbbb09',
  email: 'FIXTURE@EXAMPLE.INVALID',
  municipalityCode: '07101',
  password: 'ClaveTecnica12',
};
const fails = (field) => (error) => !!error.getResponse?.().fieldErrors?.[field];

test('ROOT: reutiliza validación, normaliza identidad y conserva la contraseña', async () => {
  const parsed = await validateRootAccount(input);
  assert.equal(parsed.firstName, 'Fixture');
  assert.equal(parsed.paternalLastName, 'Apellido compuesto');
  assert.equal(parsed.email, 'fixture@example.invalid');
  assert.equal(parsed.curp, 'BABB000101HCSBBB09');
  assert.equal(parsed.password, input.password);
  assert.equal(
    (await validateRootAccount({ ...input, password: '🌿'.repeat(12) })).password,
    '🌿'.repeat(12),
  );
});

test('ROOT: exige municipio y apellidos separados, sin aceptar roles ni perfiles del archivo', async () => {
  for (const raw of [
    null,
    [],
    {},
    { ...input, lastName: 'Anterior' },
    { ...input, role: 'ROOT' },
    { ...input, citizen: { create: {} } },
  ])
    await assert.rejects(validateRootAccount(raw));
  await assert.rejects(
    validateRootAccount({ ...input, municipalityCode: undefined }),
    fails('municipalityCode'),
  );
  await assert.rejects(
    validateRootAccount({ ...input, paternalLastName: undefined }),
    fails('paternalLastName'),
  );
  await assert.rejects(
    validateRootAccount({ ...input, municipalityCode: '07999' }),
    fails('municipalityCode'),
  );
  for (const password of ['short', 'Clave conEspacio', 'password1234'])
    await assert.rejects(validateRootAccount({ ...input, password }), fails('password'));
});

test('ROOT: no vuelve a aprovisionar y no promueve una identidad existente', async () => {
  let writes = 0;
  const tx = {
    $queryRaw: async () => [],
    role: { findUnique: async () => ({ id: 'role', active: true }) },
    user: {
      count: async () => 1,
      findFirst: async () => null,
      create: async () => {
        writes++;
      },
    },
  };
  const db = { $transaction: async (action) => action(tx) };
  await assert.rejects(provisionRoot(db, input), (error) => error.getStatus() === 409);
  tx.user.count = async () => 0;
  tx.user.findFirst = async () => ({ id: 'existing' });
  await assert.rejects(provisionRoot(db, input), (error) => error.getStatus() === 409);
  assert.equal(writes, 0);
});

test('CLI ROOT: un JSON inválido no filtra su contenido ni abre una conexión', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ev-root-'));
  const marker = 'PRIVATE_INPUT_MUST_NEVER_APPEAR';
  try {
    const file = join(directory, 'private.json');
    writeFileSync(file, `{"password":"${marker}"`, { mode: 0o600 });
    const result = Bun.spawnSync(
      [
        process.execPath,
        fileURLToPath(new URL('../../../scripts/provision-root.mjs', import.meta.url)),
        file,
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://127.0.0.1:1/never_connect',
          DATABASE_URL_FILE: undefined,
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 5000,
      },
    );
    assert.equal(result.exitCode, 1);
    const output = result.stdout.toString() + result.stderr.toString();
    assert.equal(output.includes(marker), false);
    assert.equal(output.includes('password'), false);
    assert.ok(output.includes('archivo privado'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
