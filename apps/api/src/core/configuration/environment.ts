import { readFileSync } from 'node:fs';

export function environmentSecret(name: string): string {
  const direct = process.env[name];
  const path = process.env[`${name}_FILE`];
  if (path && direct) throw new Error(`Configura solo ${name} o ${name}_FILE.`);
  if (!path) return direct || '';
  // Retirar únicamente el salto final del archivo, conservando el contenido del secreto.
  try {
    return readFileSync(path, 'utf8').replace(/\r?\n$/, '');
  } catch {
    throw new Error(`No fue posible leer ${name}_FILE.`);
  }
}
