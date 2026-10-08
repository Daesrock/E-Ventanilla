import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function fieldFailure(fieldErrors: Record<string, string>) {
  return new BadRequestException({ message: 'Revisa los campos indicados.', code: 'VALIDATION_ERROR', fieldErrors });
}

const messages: Record<string, string> = {
  firstName: 'Escribe tu nombre (máximo 100 caracteres).',
  lastName: 'Escribe tus apellidos (máximo 150 caracteres).',
  curp: 'Escribe una CURP de 18 caracteres con formato válido.',
  email: 'Escribe un correo electrónico válido (máximo 254 caracteres).',
  identifier: 'Escribe tu CURP o correo (máximo 254 caracteres).',
  municipality: 'Selecciona un municipio de Chiapas.',
  municipalityCode: 'Selecciona un municipio de Chiapas.',
  phone: 'Escribe un teléfono de hasta 25 caracteres o deja el campo vacío.',
  rfc: 'Escribe un RFC con formato válido o deja el campo vacío.',
  code: 'Escribe el código de 8 dígitos.',
};

export function validationFailure(errors: ValidationError[]) {
  return fieldFailure(Object.fromEntries(errors.map(error => [error.property,
    error.property === 'password'
      ? error.constraints?.newPassword ?? 'Escribe una contraseña de hasta 128 caracteres.'
      : messages[error.property] ?? 'Este campo no es válido.',
  ])));
}
