import type { RegisterDto } from './auth.dto.js';
import { fieldFailure } from '../../core/validation/validation.js';

/** Admite clientes anteriores, sin tratar de adivinar la división de sus apellidos. */
export function registrationSurnames(
  data: Pick<RegisterDto, 'lastName' | 'paternalLastName' | 'maternalLastName'>,
) {
  const paternal = data.paternalLastName?.trim();
  const maternal = data.maternalLastName?.trim() || null;
  const legacy = data.lastName?.trim();
  if (paternal || maternal) {
    if (legacy)
      throw fieldFailure({
        paternalLastName: 'Envía los apellidos por separado, sin el campo anterior.',
      });
    if (!paternal) throw fieldFailure({ paternalLastName: 'Escribe tu apellido paterno.' });
    return {
      paternalLastName: paternal,
      maternalLastName: maternal,
      lastName: [paternal, maternal].filter(Boolean).join(' '),
    };
  }
  if (!legacy) throw fieldFailure({ paternalLastName: 'Escribe tu apellido paterno.' });
  return { paternalLastName: null, maternalLastName: null, lastName: legacy };
}
