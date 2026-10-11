import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../dist/features/auth/auth.service.js';
import { config } from '../dist/core/configuration/config.js';
import { codeDigest, createCode } from '../dist/core/security/crypto.js';
import { ChallengeService } from '../dist/features/challenges/challenge.service.js';

// Almacenamiento de prueba aislado: no inserta ciudadanos ni datos en PostgreSQL.
function fixture({ expired = false, verified = false, purpose = 'VERIFY_EMAIL' } = {}) {
  const code = createCode();
  const user = { id: randomUUID(), active: true, emailVerifiedAt: verified ? new Date() : null };
  const challenge = {
    id: randomUUID(),
    purpose,
    attempts: 0,
    consumedAt: null,
    expiresAt: new Date(Date.now() + (expired ? -1000 : 60000)),
    digest: codeDigest(config.codeSecret, user.id, purpose, code),
  };
  const state = { user, challenge, sessions: 2 };
  const tx = {
    $queryRaw: async () => [],
    user: {
      findUniqueOrThrow: async () => state.user,
      update: async ({ data }) => Object.assign(state.user, data),
    },
    authChallenge: {
      findFirst: async ({ where }) =>
        challenge.purpose === where.purpose && !challenge.consumedAt ? challenge : null,
      update: async ({ data }) => {
        if (data.attempts) challenge.attempts += data.attempts.increment;
        if (data.consumedAt) challenge.consumedAt = data.consumedAt;
        return challenge;
      },
      updateMany: async () => ({ count: 0 }),
    },
    session: {
      deleteMany: async () => {
        state.sessions = 0;
        return { count: 2 };
      },
    },
  };
  const db = {
    user: { findUnique: async () => state.user },
    $transaction: async (action) => action(tx),
  };
  const auth = new AuthService(db, {});
  return { auth, challenges: new ChallengeService(db), code, state, user };
}

test('un código vencido no verifica el correo', async () => {
  const { auth, user, code, state } = fixture({ expired: true });
  assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', code), false);
  assert.equal(state.user.emailVerifiedAt, null);
});

test('los intentos fallidos se conservan y bloquean incluso un código correcto al llegar al límite', async () => {
  const { auth, user, code, state } = fixture();
  const wrong = String((Number(code) + 1) % 100000000).padStart(8, '0');
  for (let i = 0; i < config.codeAttempts; i++)
    assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', wrong), false);
  assert.equal(state.challenge.attempts, config.codeAttempts);
  assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', code), false);
  assert.equal(state.user.emailVerifiedAt, null);
});

test('la verificación consume el código y no permite reutilizarlo', async () => {
  const { auth, user, code, state } = fixture();
  assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', code), true);
  assert.ok(state.user.emailVerifiedAt);
  assert.ok(state.challenge.consumedAt);
  assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', code), false);
});

test('un restablecimiento válido actualiza la credencial y revoca las sesiones', async () => {
  const { auth, user, code, state } = fixture({ verified: true, purpose: 'RESET_PASSWORD' });
  const digest = randomUUID();
  assert.equal(await auth.consumeCode(user, 'RESET_PASSWORD', code, digest), true);
  assert.equal(state.user.passwordHash, digest);
  assert.equal(state.sessions, 0);
});

test('validar el código de recuperación no cambia contraseña ni sesiones; guardar lo consume', async () => {
  const { auth, challenges, user, code, state } = fixture({
    verified: true,
    purpose: 'RESET_PASSWORD',
  });
  const checked = await auth.verifyResetCode({ identifier: 'isolated', code });
  assert.equal(checked.expiresAt, state.challenge.expiresAt.toISOString());
  assert.equal(state.challenge.consumedAt, null);
  assert.equal(state.user.passwordHash, undefined);
  assert.equal(state.sessions, 2);
  await auth.resetPassword({ identifier: 'isolated', code, password: 'ClaveDePrueba🪻' });
  assert.ok(state.user.passwordHash.startsWith('scrypt$'));
  assert.equal(state.sessions, 0);
  assert.equal(await challenges.checkResetCode(user, code), null);
  await assert.rejects(
    auth.verifyResetCode({ identifier: 'isolated', code }),
    (error) => error.getStatus() === 400,
  );
});

test('recuperación rechaza código vencido, finalidad incorrecta, cuenta pendiente y límite de intentos', async () => {
  for (const options of [
    { verified: true, expired: true, purpose: 'RESET_PASSWORD' },
    { verified: true, purpose: 'VERIFY_EMAIL' },
    { verified: false, purpose: 'RESET_PASSWORD' },
  ]) {
    const { challenges, user, code, state } = fixture(options);
    assert.equal(await challenges.checkResetCode(user, code), null);
    assert.equal(state.challenge.consumedAt, null);
    assert.equal(state.sessions, 2);
  }
  const { challenges, user, code, state } = fixture({ verified: true, purpose: 'RESET_PASSWORD' });
  const wrong = String((Number(code) + 1) % 100000000).padStart(8, '0');
  for (let i = 0; i < config.codeAttempts; i++)
    assert.equal(await challenges.checkResetCode(user, wrong), null);
  assert.equal(state.challenge.attempts, config.codeAttempts);
  assert.equal(await challenges.checkResetCode(user, code), null);
});

test('el código puede vencer entre comprobarlo y guardar; no cambia la contraseña', async () => {
  const { auth, code, state } = fixture({ verified: true, purpose: 'RESET_PASSWORD' });
  await auth.verifyResetCode({ identifier: 'isolated', code });
  state.challenge.expiresAt = new Date(Date.now() - 1);
  await assert.rejects(
    auth.resetPassword({ identifier: 'isolated', code, password: 'ClaveDePrueba🪻' }),
    (error) => typeof error.getResponse().fieldErrors.code === 'string',
  );
  assert.equal(state.user.passwordHash, undefined);
  assert.equal(state.sessions, 2);
});
