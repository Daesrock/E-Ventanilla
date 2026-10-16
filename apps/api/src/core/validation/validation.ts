import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function fieldFailure(fieldErrors: Record<string, string>) {
  return new BadRequestException({
    message: 'Revisa los campos indicados.',
    code: 'VALIDATION_ERROR',
    fieldErrors,
  });
}

const messages: Record<string, string> = {
  firstName: 'Escribe tu nombre (máximo 100 caracteres).',
  lastName: 'Escribe tus apellidos (máximo 150 caracteres).',
  paternalLastName: 'Escribe tu apellido paterno (máximo 100 caracteres).',
  maternalLastName: 'Revisa tu apellido materno (máximo 100 caracteres) o deja el campo vacío.',
  curp: 'Escribe una CURP de 18 caracteres con formato válido.',
  email: 'Escribe un correo electrónico válido (máximo 254 caracteres).',
  identifier: 'Escribe tu CURP o correo (máximo 254 caracteres).',
  municipality: 'Selecciona un municipio de Chiapas.',
  municipalityCode: 'Selecciona un municipio de Chiapas.',
  phone: 'Escribe un teléfono de 10 dígitos o deja el campo vacío.',
  rfc: 'Escribe un RFC con formato válido o deja el campo vacío.',
  code: 'Escribe el código de 8 dígitos.',
  name: 'Escribe un nombre de máximo 200 caracteres.',
  type: 'Selecciona el tipo de sede: VUGE o VIM.',
  date: 'Escribe una fecha válida en formato AAAA-MM-DD.',
  startsAt: 'Escribe una hora válida en formato HH:MM.',
  endsAt: 'Escribe una hora válida en formato HH:MM.',
  capacity: 'Escribe una capacidad mayor que cero.',
  cost: 'Escribe un costo válido con dos decimales como máximo.',
  estimatedMinutes: 'Escribe una duración en minutos mayor que cero.',
  active: 'Usa true o false.',
  published: 'Usa true o false.',
  role: 'Selecciona un rol administrativo válido.',
  counterHeadId: 'Selecciona un jefe de ventanilla activo.',
  counterStaff: 'Usa true o false.',
  action: 'Selecciona una acción de atención válida.',
  counterId: 'Selecciona el mostrador de atención.',
  qrToken: 'Revisa el código de la cita.',
  items: 'Revisa los trámites indicados.',
  latitude: 'Indica una latitud válida o deja el campo vacío.',
  longitude: 'Indica una longitud válida o deja el campo vacío.',
  street: 'Escribe una calle de máximo 150 caracteres.',
  exteriorNumber: 'Escribe un número exterior de máximo 20 caracteres.',
  interiorNumber: 'Escribe un número interior de máximo 20 caracteres.',
  neighborhood: 'Escribe una colonia de máximo 150 caracteres.',
  postalCode: 'Escribe un código postal de 5 dígitos.',
  socialSecurityNumber: 'Escribe un NSS de 11 dígitos o deja el campo vacío.',
  sourceKey: 'Indica la clave de la fuente oficial.',
  sourceUrl: 'Indica la URL https de la fuente oficial.',
  sourceSha256: 'Indica el sha256 (64 hexadecimales) de la fuente corroborada.',
  sourceCheckedAt: 'Indica una fecha válida de corroboración.',
  category: 'Escribe una categoría de máximo 150 caracteres.',
  requirements: 'Escribe los requisitos (máximo 4000 caracteres).',
  description: 'Escribe la descripción solicitada.',
  address: 'Escribe una dirección de máximo 300 caracteres.',
  officeHours: 'Escribe un horario de máximo 200 caracteres.',
};

export function validationFailure(errors: ValidationError[]) {
  return fieldFailure(
    Object.fromEntries(
      errors.map((error) => [
        error.property,
        error.property === 'password'
          ? (error.constraints?.newPassword ?? 'Revisa tu contraseña.')
          : (messages[error.property] ?? 'Este campo no es válido.'),
      ]),
    ),
  );
}
