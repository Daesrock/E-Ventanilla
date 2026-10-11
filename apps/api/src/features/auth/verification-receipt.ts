import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const lifetimeMs = 30 * 60 * 1000;
const scope = 'eventanilla:verification-status:v1';
const key = (secret: string) => createHmac('sha256', secret).update(scope).digest();

export function createVerificationReceipt(secret: string, userId: string, now = Date.now()) {
  const expiresAt = now + lifetimeMs;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  cipher.setAAD(Buffer.from(scope));
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt, version: 1 }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    trackingToken: [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.'),
    trackingExpiresAt: new Date(expiresAt).toISOString(),
  };
}

export function readVerificationReceipt(
  secret: string,
  token: string,
  now = Date.now(),
): string | undefined {
  try {
    if (token.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
      return undefined;
    const [iv, tag, encrypted] = token.split('.').map((part) => Buffer.from(part, 'base64url'));
    if (!iv || !tag || !encrypted || iv.length !== 12 || tag.length !== 16) return undefined;
    const cipher = createDecipheriv('aes-256-gcm', key(secret), iv);
    cipher.setAAD(Buffer.from(scope));
    cipher.setAuthTag(tag);
    const payload = JSON.parse(
      Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8'),
    );
    if (
      payload.version !== 1 ||
      typeof payload.userId !== 'string' ||
      !payload.userId ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt <= now ||
      payload.expiresAt > now + lifetimeMs
    )
      return undefined;
    return payload.userId;
  } catch {
    return undefined;
  }
}
