import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

const scryptOptions = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, scryptOptions, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | undefined) {
  const parts = stored?.split('$');
  const salt = parts?.[1] || '00000000000000000000000000000000';
  const derived = await derive(password, salt);
  const expected = Buffer.from(parts?.[2] || '00'.repeat(64), 'hex');
  return !!stored && expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function createCode() { return randomInt(0, 100000000).toString().padStart(8, '0'); }
export function createToken() { return randomBytes(32).toString('base64url'); }
export function tokenDigest(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function codeDigest(secret: string, userId: string, purpose: string, code: string) {
  return createHmac('sha256', secret).update(`${userId}:${purpose}:${code}`).digest('hex');
}
export function equalDigest(first: string, second: string) {
  const a = Buffer.from(first, 'hex');
  const b = Buffer.from(second, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function encryptCode(secret: string, code: string) {
  const key = createHmac('sha256', secret).update('mail-outbox').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(value => value.toString('base64url')).join('.');
}

export function decryptCode(secret: string, stored: string) {
  const [iv, tag, payload] = stored.split('.').map(value => Buffer.from(value, 'base64url'));
  if (!iv || !tag || !payload) throw new Error('Credencial cifrada inválida.');
  const key = createHmac('sha256', secret).update('mail-outbox').digest();
  const cipher = createDecipheriv('aes-256-gcm', key, iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(payload), cipher.final()]).toString('utf8');
}
