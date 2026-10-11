import { resolve } from 'node:path';
import { rmSync } from 'node:fs';

const directory = resolve(import.meta.dir, 'dist');
if (directory !== resolve(process.cwd(), 'dist'))
  throw new Error('Ejecuta la compilación desde apps/api.');
// Solo se elimina la salida regenerable del compilador dentro de esta aplicación.
rmSync(directory, { recursive: true, force: true });
