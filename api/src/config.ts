import 'dotenv/config';

function positiveInteger(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Configuración inválida: ${name}`);
  return value;
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: positiveInteger('PORT', 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  resendKey: process.env.RESEND_API_KEY?.trim() || '',
  resendFrom: process.env.RESEND_FROM?.trim() || '',
  codeSecret: process.env.AUTH_CODE_SECRET || '',
  codeTtl: positiveInteger('AUTH_CODE_TTL_SECONDS', 600),
  codeAttempts: positiveInteger('AUTH_CODE_ATTEMPTS', 5),
  resendSeconds: positiveInteger('AUTH_CODE_RESEND_SECONDS', 60),
  sessionTtl: positiveInteger('AUTH_SESSION_TTL_SECONDS', 604800),
};

export function validateConfig() {
  if (!/^postgres(?:ql)?:\/\//.test(config.databaseUrl)) throw new Error('Configura DATABASE_URL en api/.env.');
  if (config.codeSecret.length < 64) throw new Error('AUTH_CODE_SECRET debe tener al menos 64 caracteres aleatorios.');
}
