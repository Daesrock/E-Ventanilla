import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createCode, createToken, tokenDigest, codeDigest, encryptCode, decryptCode, equalDigest, hashPassword, verifyPassword } from '../dist/crypto.js';

test('los códigos no sirven para otra cuenta o para otro propósito', () => {
  const secret = randomBytes(32).toString('hex');
  const id = randomUUID();
  const code = createCode();
  const digest = codeDigest(secret, id, 'VERIFY_EMAIL', code);
  assert.match(code, /^\d{8}$/);
  assert.ok(equalDigest(digest, codeDigest(secret, id, 'VERIFY_EMAIL', code)));
  assert.ok(!equalDigest(digest, codeDigest(secret, id, 'RESET_PASSWORD', code)));
  assert.ok(!equalDigest(digest, codeDigest(secret, randomUUID(), 'VERIFY_EMAIL', code)));
});

test('las sesiones generan tokens distintos y solo almacenan su resumen', () => {
  const first = createToken();
  const second = createToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(tokenDigest(first), first);
  assert.notEqual(tokenDigest(first), tokenDigest(second));
});

test('la cola conserva el código cifrado y detecta una clave de descifrado incorrecta', () => {
  const secret = randomBytes(32).toString('hex');
  const code = createCode();
  const encrypted = encryptCode(secret, code);
  assert.notEqual(encrypted, code);
  assert.equal(decryptCode(secret, encrypted), code);
  assert.throws(() => decryptCode(randomBytes(32).toString('hex'), encrypted));
});

test('la contraseña se verifica sin almacenar texto plano y cada hash usa una sal propia', async () => {
  const password = randomBytes(24).toString('base64url');
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.ok(await verifyPassword(password, first));
  assert.ok(!await verifyPassword(password + '!', first));
  assert.ok(!await verifyPassword(password, undefined));
});
