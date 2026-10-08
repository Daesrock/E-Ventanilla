import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { fieldFailure } from './validation.js';

const metadata = JSON.parse(readFileSync(new URL('../resources/common-passwords.metadata.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../resources/common-passwords.txt', import.meta.url));
if (createHash('sha256').update(source).digest('hex') !== metadata.sha256) throw new Error('La lista de contraseñas no coincide con su checksum.');
const blocked = new Set(source.toString('utf8').split(/\r?\n/).filter(Boolean).map(value => value.toLowerCase()));

export function passwordError(value: unknown): string | undefined {
  if (typeof value !== 'string' || Array.from(value).length < 15) return 'Usa al menos 15 caracteres. Puedes usar una frase con espacios.';
  if (Array.from(value).length > 128) return 'Usa como máximo 128 caracteres.';
  // Solo la comparación con la lista cambia de caja; la credencial se conserva intacta.
  if (blocked.has(value.toLowerCase())) return 'Esta contraseña es demasiado común. Elige una frase diferente.';
  return undefined;
}

export function requireNewPassword(value: unknown) {
  const error = passwordError(value);
  if (error) throw fieldFailure({ password: error });
}

export function NewPassword(options?: ValidationOptions): PropertyDecorator {
  return (target, property) => registerDecorator({
    name: 'newPassword', target: target.constructor, propertyName: String(property), options,
    validator: {
      validate: value => !passwordError(value),
      defaultMessage: args => passwordError(args?.value) ?? 'Revisa tu contraseña.',
    },
  });
}
