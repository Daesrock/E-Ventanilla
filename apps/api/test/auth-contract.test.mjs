import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthService } from '../dist/features/auth/auth.service.js';
import { AuthController } from '../dist/features/auth/auth.controller.js';
import { DatabaseService } from '../dist/core/persistence/database.service.js';
import { StatusController } from '../dist/app.module.js';
import { RegisterDto, LoginDto, ResetDto } from '../dist/features/auth/auth.dto.js';
import { passwordError } from '../dist/features/auth/password-policy.js';
import { validationFailure } from '../dist/core/validation/validation.js';
import {
  municipalityCatalog,
  normalizeMunicipality,
  resolveMunicipality,
} from '../dist/features/catalog/municipalities.js';
import { hashPassword, verifyPassword } from '../dist/core/security/crypto.js';

test('contraseñas nuevas de 12 a 20 puntos de código Unicode, sin mezcla obligatoria ni espacios', async () => {
  for (const value of [
    '🪻'.repeat(12),
    'z'.repeat(12),
    '🪻'.repeat(20),
    'z'.repeat(20),
    'ClaveSinSimbolos',
  ]) {
    assert.equal(passwordError(value), undefined);
    for (const Dto of [RegisterDto, ResetDto]) {
      const errors = await validate(
        plainToInstance(Dto, { identifier: 'CURP', code: '12345678', password: value }),
      );
      assert.equal(
        errors.some((error) => error.property === 'password'),
        false,
      );
    }
  }
  for (const value of ['🪻'.repeat(11), 'z'.repeat(11), '🪻'.repeat(21), 'z'.repeat(21)]) {
    assert.ok(passwordError(value));
    for (const Dto of [RegisterDto, ResetDto]) {
      const errors = await validate(plainToInstance(Dto, { password: value }));
      assert.ok(errors.some((error) => error.property === 'password'));
    }
  }
  for (const space of [
    ' ',
    '\t',
    '\n',
    '\r',
    '\u00a0',
    '\u1680',
    '\u2003',
    '\u2028',
    '\u2029',
    '\u202f',
    '\u205f',
    '\u3000',
    '\ufeff',
  ]) {
    for (const value of [
      `${space}ClaveDePrueba`,
      `Clave${space}DePrueba`,
      `ClaveDePrueba${space}`,
    ]) {
      assert.match(passwordError(value), /espacios/);
      for (const Dto of [RegisterDto, ResetDto]) {
        const errors = await validate(plainToInstance(Dto, { password: value }));
        assert.ok(errors.some((error) => error.property === 'password'));
      }
    }
  }
});

test('el acceso conserva contraseñas anteriores con espacios o más de 20 caracteres, sin recortarlas', async () => {
  for (const password of ['Clave anterior', 'z'.repeat(128), '🪻'.repeat(128)]) {
    assert.ok(passwordError(password));
    assert.equal(
      (await validate(plainToInstance(LoginDto, { identifier: 'CURP', password }))).length,
      0,
    );
  }
  const raw = '  una frase con 🪻 espacios  ';
  const digest = await hashPassword(raw);
  assert.equal(await verifyPassword(raw, digest), true);
  assert.equal(await verifyPassword(raw.trim(), digest), false);
  const user = {
    id: 'technical-fixture',
    active: true,
    emailVerifiedAt: new Date(),
    passwordHash: digest,
  };
  const tx = {
    $queryRaw: async () => [],
    user: { findUniqueOrThrow: async () => user },
    session: { deleteMany: async () => {}, create: async () => {} },
  };
  const auth = new AuthService(
    { user: { findUnique: async () => user }, $transaction: async (action) => action(tx) },
    {},
  );
  assert.match(
    (await auth.login({ identifier: 'CURP', password: raw })).token,
    /^[A-Za-z0-9_-]{43}$/,
  );
  assert.equal(user.passwordHash, digest);
});

test('la lista NCSC se verifica y compara contraseñas completas en registro y recuperación', async () => {
  const raw = readFileSync(new URL('../resources/common-passwords.txt', import.meta.url));
  const meta = JSON.parse(
    readFileSync(new URL('../resources/common-passwords.metadata.json', import.meta.url)),
  );
  assert.equal(createHash('sha256').update(raw).digest('hex'), meta.sha256);
  const common = raw
    .toString('utf8')
    .split(/\r?\n/)
    .find((value) => Array.from(value).length === 12 && !/\s/u.test(value));
  assert.match(passwordError(common), /común/);
  assert.match(passwordError(common.toUpperCase()), /común/);
  assert.equal(passwordError(`${common}🪻`), undefined);
  for (const Dto of [RegisterDto, ResetDto]) {
    const errors = await validate(plainToInstance(Dto, { password: common }));
    assert.ok(errors.some((error) => error.property === 'password'));
  }
  let databaseTouched = false;
  const auth = new AuthService(
    {
      user: {
        findUnique: () => {
          databaseTouched = true;
        },
      },
    },
    {},
  );
  await assert.rejects(
    auth.resetPassword({ password: common }),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(auth.register({ password: common }), (error) => error.getStatus() === 400);
  assert.equal(databaseTouched, false);
});

test('las instantáneas Android/API son idénticas, únicas y con claves exclusivamente de Chiapas', () => {
  for (const name of [
    'municipalities.json',
    'common-passwords.txt',
    'common-passwords.metadata.json',
    'SecLists-LICENSE.txt',
  ]) {
    assert.deepEqual(
      readFileSync(new URL(`../resources/${name}`, import.meta.url)),
      readFileSync(new URL(`../../android/app/src/main/assets/${name}`, import.meta.url)),
    );
  }
  const { municipalities, metadata } = municipalityCatalog;
  assert.equal(
    createHash('sha256').update(JSON.stringify(municipalities)).digest('hex'),
    metadata.municipalitiesSha256,
  );
  assert.equal(new Set(municipalities.map((item) => item.code)).size, municipalities.length);
  assert.ok(municipalities.every((item) => /^07\d{3}$/.test(item.code) && item.name.trim()));
  assert.equal(metadata.entityCode, '07');
  const accented = municipalities.find((item) => item.name !== normalizeMunicipality(item.name));
  assert.deepEqual(resolveMunicipality(accented.code), accented);
  assert.deepEqual(resolveMunicipality(accented.code, null), accented);
  assert.deepEqual(resolveMunicipality(null, accented.name), accented);
  assert.throws(
    () => resolveMunicipality(null, null),
    (error) => error.getStatus() === 400,
  );
  assert.deepEqual(
    resolveMunicipality(undefined, normalizeMunicipality(accented.name).toUpperCase()),
    accented,
  );
  for (const code of ['01001', '07999', '', '070001'])
    assert.throws(
      () => resolveMunicipality(code),
      (error) => error.getStatus() === 400,
    );
  assert.throws(
    () => resolveMunicipality(),
    (error) => error.getStatus() === 400,
  );
  assert.throws(
    () => resolveMunicipality(undefined, 'no pertenece al catálogo'),
    (error) => error.getStatus() === 400,
  );
  assert.throws(
    () => resolveMunicipality(municipalities[0].code, municipalities[1].name),
    (error) => error.getStatus() === 400,
  );
});

test('el registro guarda clave y nombre oficial incluso con el nombre enviado por un cliente anterior', async () => {
  const saved = [];
  const tx = {
    role: { findUniqueOrThrow: async () => ({ id: 'isolated-role' }) },
    municipality: {
      findUniqueOrThrow: async ({ where }) => ({
        id: 'isolated-municipality',
        ...resolveMunicipality(where.code),
      }),
    },
    user: {
      create: async ({ data }) => {
        saved.push(data);
        return { ...data, id: 'technical-fixture' };
      },
    },
  };
  const auth = new AuthService(
    { $transaction: async (action) => action(tx) },
    { ensureConfigured() {} },
  );
  // La cola se sustituye solo en este fixture aislado; nunca se envía correo.
  auth.issueCode = async () => {};
  auth.createSession = async () => ({
    token: 'isolated-session-fixture',
    user: { emailVerified: false },
  });
  const item = municipalityCatalog.municipalities.find((item) => item.name.includes('á'));
  for (const municipality of [
    { municipalityCode: item.code },
    { municipality: normalizeMunicipality(item.name).toUpperCase() },
  ]) {
    await auth.register({
      ...municipality,
      lastName: 'Fixture aislado',
      password: 'ClaveDePrueba🪻',
    });
    assert.equal(saved.at(-1).municipality, item.name);
    assert.equal(saved.at(-1).municipalityCode, item.code);
  }
  await assert.rejects(
    auth.register({
      municipalityCode: '01001',
      lastName: 'Fixture aislado',
      password: 'ClaveDePrueba🪻',
    }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(saved.length, 2);
});

test('contraseñas anteriores siguen válidas y el correo pendiente solo se revela después de credenciales correctas', async () => {
  const oldPassword = 'anterior12!';
  assert.ok(passwordError(oldPassword));
  const digest = await hashPassword(oldPassword);
  assert.equal(
    (await validate(plainToInstance(LoginDto, { identifier: 'CURP', password: oldPassword })))
      .length,
    0,
  );
  const user = {
    id: 'technical-fixture',
    email: 'pending@invalid.test',
    active: true,
    emailVerifiedAt: new Date(),
    passwordHash: digest,
  };
  const sessions = [];
  const tx = {
    $queryRaw: async () => [],
    user: { findUniqueOrThrow: async () => user },
    session: {
      deleteMany: async () => {},
      create: async ({ data }) => {
        sessions.push(data);
      },
    },
  };
  const auth = new AuthService(
    { user: { findUnique: async () => user }, $transaction: async (action) => action(tx) },
    {},
  );
  const result = await auth.login({ identifier: 'CURP', password: oldPassword });
  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(sessions.length, 1);
  assert.equal(user.passwordHash, digest);
  user.emailVerifiedAt = null;
  await assert.rejects(auth.login({ identifier: 'CURP', password: oldPassword }), (error) => {
    assert.equal(error.getStatus(), 403);
    assert.equal(error.getResponse().code, 'EMAIL_VERIFICATION_REQUIRED');
    assert.equal(error.getResponse().email, user.email);
    return true;
  });
  await assert.rejects(auth.login({ identifier: 'CURP', password: 'incorrecta' }), (error) => {
    assert.equal(error.getStatus(), 401);
    assert.equal(error.getResponse().email, undefined);
    assert.equal(error.getResponse().code, undefined);
    return true;
  });
  assert.equal(sessions.length, 1);
});

test('contrato HTTP: catálogo público sin DB, errores por campo y verificación contextual sin sesión', async () => {
  const auth = {
    login: async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException({
        message: 'Verifica tu correo.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: 'pending@invalid.test',
      });
    },
    register: async (data) => resolveMunicipality(data.municipalityCode, data.municipality),
    verifyResetCode: async (data) => {
      assert.equal(data.code, '00001234');
      return { expiresAt: '2099-01-01T00:00:00.000Z' };
    },
  };
  class TestModule {}
  Module({
    controllers: [StatusController, AuthController],
    providers: [
      { provide: DatabaseService, useValue: {} },
      { provide: AuthService, useValue: auth },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationFailure,
    }),
  );
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const get = await fetch(`${base}/v1/catalog/municipalities`);
    assert.equal(get.status, 200);
    assert.deepEqual(await get.json(), municipalityCatalog);
    const post = (path, body) =>
      fetch(`${base}/v1/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const invalid = await post('register', { password: 'short', municipalityCode: '01001' });
    assert.equal(invalid.status, 400);
    const body = await invalid.json();
    assert.equal(typeof body.message, 'string');
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.ok(body.fieldErrors.password);
    assert.ok(body.fieldErrors.municipalityCode);
    assert.equal(JSON.stringify(body).includes('short'), false);
    const pending = await post('login', { identifier: 'CURP', password: 'anterior12!' });
    assert.equal(pending.status, 403);
    const data = await pending.json();
    assert.equal(data.code, 'EMAIL_VERIFICATION_REQUIRED');
    assert.equal(data.token, undefined);
    const incomplete = await post('verify-reset-code', { identifier: 'CURP', code: '0000123' });
    assert.equal(incomplete.status, 400);
    assert.ok((await incomplete.json()).fieldErrors.code);
    const checked = await post('verify-reset-code', { identifier: 'CURP', code: '00001234' });
    assert.equal(checked.status, 201);
    assert.deepEqual(await checked.json(), { expiresAt: '2099-01-01T00:00:00.000Z' });
  } finally {
    await app.close();
  }
});
