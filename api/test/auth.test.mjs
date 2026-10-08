import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../dist/auth.service.js';
import { config } from '../dist/config.js';
import { codeDigest, createCode } from '../dist/crypto.js';

// Almacenamiento de prueba aislado: no inserta ciudadanos ni datos en PostgreSQL.
function fixture({ expired = false, verified = false, purpose = 'VERIFY_EMAIL' } = {}) {
  const code = createCode();
  const user = { id: randomUUID(), active: true, emailVerifiedAt: verified ? new Date() : null };
  const challenge = {
    id: randomUUID(), purpose, attempts: 0, consumedAt: null,
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
      findFirst: async ({ where }) => challenge.purpose === where.purpose && !challenge.consumedAt ? challenge : null,
      update: async ({ data }) => {
        if (data.attempts) challenge.attempts += data.attempts.increment;
        if (data.consumedAt) challenge.consumedAt = data.consumedAt;
        return challenge;
      },
      updateMany: async () => ({ count: 0 }),
    },
    session: { deleteMany: async () => { state.sessions = 0; return { count: 2 }; } },
  };
  const auth = new AuthService({ $transaction: async action => action(tx) }, {});
  return { auth, code, state, user };
}

test('un código vencido no verifica el correo', async () => {
  const { auth, user, code, state } = fixture({ expired: true });
  assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', code), false);
  assert.equal(state.user.emailVerifiedAt, null);
});

test('los intentos fallidos se conservan y bloquean incluso un código correcto al llegar al límite', async () => {
  const { auth, user, code, state } = fixture();
  const wrong = String((Number(code) + 1) % 100000000).padStart(8, '0');
  for (let i = 0; i < config.codeAttempts; i++) assert.equal(await auth.consumeCode(user, 'VERIFY_EMAIL', wrong), false);
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
