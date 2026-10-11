import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from '../dist/features/auth/auth.service.js';
import { AuthController } from '../dist/features/auth/auth.controller.js';
import { config } from '../dist/core/configuration/config.js';
import {
  createVerificationReceipt,
  readVerificationReceipt,
} from '../dist/features/auth/verification-receipt.js';
import { decryptCode, hashPassword, tokenDigest } from '../dist/core/security/crypto.js';
import { municipalityCatalog } from '../dist/features/catalog/municipalities.js';

function fixture() {
  const user = {
    id: randomUUID(),
    active: true,
    emailVerifiedAt: null,
    email: 'fixture@invalid.test',
    passwordHash: '',
    firstName: 'fixture',
    lastName: 'fixture',
    curp: 'fixture',
    municipality: 'fixture',
    municipalityCode: '07001',
    phone: null,
    rfc: null,
  };
  const challenges = [],
    jobs = [],
    sessions = [];
  const tx = {
    $queryRaw: async () => [],
    role: { findUniqueOrThrow: async () => ({ id: 'isolated-role' }) },
    municipality: {
      findUniqueOrThrow: async ({ where }) => ({
        id: 'isolated-municipality',
        ...municipalityCatalog.municipalities.find((item) => item.code === where.code),
      }),
    },
    user: {
      create: async ({ data }) => Object.assign(user, data),
      findUniqueOrThrow: async () => user,
      update: async ({ data }) => Object.assign(user, data),
    },
    authChallenge: {
      findFirst: async () => challenges.at(-1) ?? null,
      updateMany: async ({ data }) => {
        for (const c of challenges) if (!c.consumedAt) Object.assign(c, data);
      },
      create: async ({ data }) => {
        const c = {
          id: randomUUID(),
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          ...data,
        };
        challenges.push(c);
        return c;
      },
      update: async ({ data }) => {
        const c = challenges.at(-1);
        if (data.attempts) c.attempts += data.attempts.increment;
        else Object.assign(c, data);
        return c;
      },
    },
    mailJob: {
      create: async ({ data }) => {
        const job = { id: randomUUID(), deliveredAt: null, abandonedAt: null, ...data };
        jobs.push(job);
        challenges.at(-1).mailJob = job;
        return job;
      },
    },
    session: {
      deleteMany: async () => {},
      create: async ({ data }) => {
        sessions.push({ ...data, user });
      },
    },
  };
  const db = {
    $transaction: async (action) => action(tx),
    user: {
      create: async ({ data }) => Object.assign(user, data),
      findUnique: async ({ where }) => (where.id && where.id !== user.id ? null : user),
    },
    authChallenge: tx.authChallenge,
    session: {
      findUnique: async ({ where }) => sessions.find((s) => s.digest === where.digest) ?? null,
      deleteMany: async () => {
        sessions.length = 0;
      },
    },
  };
  return { user, challenges, jobs, sessions, auth: new AuthService(db, { ensureConfigured() {} }) };
}

test('seguimiento cifrado expira a 30 minutos, rechaza manipulación y no sirve como código ni sesión', async () => {
  const id = randomUUID(),
    now = Date.now(),
    receipt = createVerificationReceipt(config.codeSecret, id, now);
  assert.equal(Date.parse(receipt.trackingExpiresAt), now + 30 * 60 * 1000);
  assert.equal(readVerificationReceipt(config.codeSecret, receipt.trackingToken, now), id);
  assert.equal(
    readVerificationReceipt(config.codeSecret, receipt.trackingToken, now + 30 * 60 * 1000),
    undefined,
  );
  assert.equal(readVerificationReceipt('otra-clave', receipt.trackingToken, now), undefined);
  const parts = receipt.trackingToken.split('.');
  parts[2] = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
  assert.equal(readVerificationReceipt(config.codeSecret, parts.join('.'), now), undefined);
  assert.equal(readVerificationReceipt(config.codeSecret, 'a'.repeat(513), now), undefined);
  assert.equal(receipt.trackingToken.includes(id), false);
  assert.throws(() => decryptCode(config.codeSecret, receipt.trackingToken));
  const { auth } = fixture();
  await assert.rejects(
    auth.authenticate(receipt.trackingToken, false),
    (e) => e.getStatus() === 401,
  );
});

test('registro inicia sesión pendiente y encola exactamente un código; consultas no generan envíos', async () => {
  const f = fixture();
  const result = await f.auth.register({
    firstName: 'fixture',
    lastName: 'fixture',
    curp: 'fixture',
    email: f.user.email,
    password: 'ClaveDePrueba🪻',
    municipalityCode: municipalityCatalog.municipalities[0].code,
  });
  assert.equal(result.user.emailVerified, false);
  assert.equal(f.jobs.length, 1);
  assert.equal(f.sessions.length, 1);
  assert.equal((await f.auth.authenticate(result.token, false)).user.id, f.user.id);
  await assert.rejects(
    f.auth.authenticate(result.token),
    (e) => e.getStatus() === 403 && e.getResponse().code === 'EMAIL_VERIFICATION_REQUIRED',
  );
  const context = await f.auth.verificationContext(result.token);
  assert.equal(context.email, f.user.email);
  for (let i = 0; i < 3; i++)
    assert.equal(
      (await f.auth.verificationStatus(context.verification.trackingToken)).status,
      'pending',
    );
  assert.equal(f.jobs.length, 1);
  const code = decryptCode(config.codeSecret, f.jobs[0].ciphertext);
  const verified = await f.auth.verifyEmail({ email: f.user.email, code });
  assert.equal(verified.user.emailVerified, true);
  assert.equal((await f.auth.authenticate(result.token)).user.id, f.user.id);
  assert.equal(f.sessions.length, 1);
  assert.equal(f.sessions[0].digest, tokenDigest(result.token));
  assert.equal(
    (await f.auth.verificationStatus(result.verification.trackingToken)).status,
    'verified',
  );
});

test('login nuevo admite sesión pendiente; cliente anterior recibe 403 y credenciales incorrectas no revelan nada', async () => {
  const f = fixture();
  f.user.passwordHash = await hashPassword('ClaveDePrueba🪻');
  await assert.rejects(
    f.auth.login({ identifier: f.user.email, password: 'ClaveDePrueba🪻' }),
    (e) => {
      assert.equal(e.getStatus(), 403);
      assert.ok(e.getResponse().verification.trackingToken);
      assert.equal(e.getResponse().token, undefined);
      return true;
    },
  );
  const result = await f.auth.login({
    identifier: f.user.email,
    password: 'ClaveDePrueba🪻',
    allowPendingVerification: true,
  });
  assert.equal(result.user.emailVerified, false);
  assert.ok(result.verification.trackingToken);
  assert.equal(f.jobs.length, 0);
  await assert.rejects(
    f.auth.login({
      identifier: f.user.email,
      password: 'incorrecta',
      allowPendingVerification: true,
    }),
    (e) => {
      assert.equal(e.getStatus(), 401);
      assert.equal(e.getResponse().email, undefined);
      assert.equal(e.getResponse().verification, undefined);
      return true;
    },
  );
  f.user.active = false;
  await assert.rejects(f.auth.authenticate(result.token, false), (e) => e.getStatus() === 401);
  await assert.rejects(
    f.auth.verificationStatus(result.verification.trackingToken),
    (e) => e.getStatus() === 401,
  );
});

test('estado distingue ausencia, cola, aceptación, fallo y vencimiento sin exponer secretos', async () => {
  const f = fixture(),
    receipt = createVerificationReceipt(config.codeSecret, f.user.id);
  const get = () => f.auth.verificationStatus(receipt.trackingToken);
  assert.equal((await get()).status, 'not_requested');
  await f.auth.requestVerification(f.user.email);
  const challenge = f.challenges[0],
    job = f.jobs[0];
  const pending = await get();
  assert.equal(pending.status, 'pending');
  assert.equal(
    Date.parse(pending.resendAvailableAt) - challenge.createdAt.getTime(),
    config.resendSeconds * 1000,
  );
  assert.equal(pending.codeExpiresAt, challenge.expiresAt.toISOString());
  assert.deepEqual(Object.keys(pending).sort(), [
    'codeExpiresAt',
    'resendAvailableAt',
    'serverTime',
    'status',
  ]);
  assert.equal(JSON.stringify(pending).includes('ciphertext'), false);
  await f.auth.requestVerification(f.user.email);
  assert.equal(f.jobs.length, 1);
  job.deliveredAt = new Date();
  assert.equal((await get()).status, 'accepted');
  job.deliveredAt = null;
  job.abandonedAt = new Date();
  assert.equal((await get()).status, 'failed');
  challenge.expiresAt = new Date(Date.now() - 1);
  assert.equal((await get()).status, 'expired');
  challenge.expiresAt = new Date(Date.now() + 60000);
  challenge.attempts = config.codeAttempts;
  assert.equal((await get()).status, 'expired');
  await assert.rejects(
    f.auth.verificationStatus(
      createVerificationReceipt(config.codeSecret, randomUUID()).trackingToken,
    ),
    (e) => e.getStatus() === 401,
  );
});

test('HTTP limita seguimiento a 30/minuto y protege citas, contexto y datos personales', async () => {
  const f = fixture();
  f.user.passwordHash = await hashPassword('ClaveDePrueba🪻');
  const login = await f.auth.login({
    identifier: f.user.email,
    password: 'ClaveDePrueba🪻',
    allowPendingVerification: true,
  });
  class TestModule {}
  Module({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
    controllers: [AuthController],
    providers: [
      { provide: AuthService, useValue: f.auth },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const get = (path, token) =>
      fetch(`${base}/v1/auth/${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    assert.equal((await get('appointment-access')).status, 401);
    const denied = await get('appointment-access', login.token);
    assert.equal(denied.status, 403);
    const me = await get('me', login.token);
    assert.equal(me.status, 200);
    assert.equal((await me.json()).emailVerified, false);
    assert.equal((await get('verification-context', login.verification.trackingToken)).status, 401);
    assert.equal((await get('verification-context', login.token)).status, 200);
    assert.equal((await get('verification-status', login.token)).status, 401);
    for (let i = 0; i < 29; i++)
      assert.equal(
        (await get('verification-status', login.verification.trackingToken)).status,
        200,
      );
    assert.equal((await get('verification-status', login.verification.trackingToken)).status, 429);
    const checkReset = () =>
      fetch(`${base}/v1/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: f.user.email, code: '00001234' }),
      });
    for (let i = 0; i < 5; i++) assert.equal((await checkReset()).status, 400);
    assert.equal((await checkReset()).status, 429);
    f.user.emailVerifiedAt = new Date();
    assert.equal((await get('appointment-access', login.token)).status, 200);
  } finally {
    await app.close();
  }
});
