// Operación del propietario. No se registra en AdminModule ni tiene endpoint HTTP.
import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { hashPassword } from '../../core/security/crypto.js';
import { fieldFailure, validationFailure } from '../../core/validation/validation.js';
import { RegisterDto } from '../auth/auth.dto.js';
import { registrationSurnames } from '../auth/surnames.js';
import { resolveMunicipality } from '../catalog/municipalities.js';
import { writeAudit } from './admin.audit.js';

const inputFields = new Set([
  'firstName',
  'paternalLastName',
  'maternalLastName',
  'curp',
  'email',
  'municipalityCode',
  'password',
]);

export async function validateRootAccount(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw fieldFailure({
      input: 'El archivo debe contener un objeto JSON con los datos del titular.',
    });
  if (Object.keys(input).some((key) => !inputFields.has(key)))
    throw fieldFailure({ input: 'El archivo contiene campos que no están permitidos.' });
  const data = plainToInstance(RegisterDto, input);
  const errors = await validate(data, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw validationFailure(errors);
  if (typeof data.municipalityCode !== 'string')
    throw fieldFailure({ municipalityCode: 'Selecciona un municipio de Chiapas.' });
  // El aprovisionamiento no admite el campo lastName de clientes antiguos.
  registrationSurnames(data);
  resolveMunicipality(data.municipalityCode);
  return data;
}

export async function provisionRoot(db: PrismaClient, input: unknown) {
  const data = await validateRootAccount(input);
  const municipality = resolveMunicipality(data.municipalityCode);
  const passwordHash = await hashPassword(data.password);
  return db.$transaction(async (transaction) => {
    // Dos ejecuciones simultáneas no deben crear dos cuentas iniciales distintas.
    await transaction.$queryRaw`SELECT id FROM "Role" WHERE code = 'ROOT' FOR UPDATE`;
    const role = await transaction.role.findUnique({ where: { code: 'ROOT' } });
    if (!role?.active) throw new ConflictException('El rol ROOT no está disponible.');
    if (await transaction.user.count({ where: { roleId: role.id } }))
      throw new ConflictException(
        'La cuenta inicial ROOT ya fue aprovisionada. No se modificó ninguna cuenta.',
      );
    const existing = await transaction.user.findFirst({
      where: { OR: [{ email: data.email }, { curp: data.curp }] },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(
        'Ya existe una cuenta con ese correo o CURP. No se promueven cuentas existentes.',
      );
    const origin = await transaction.municipality.findUnique({
      where: { code: municipality.code },
    });
    if (!origin)
      throw fieldFailure({ municipalityCode: 'El municipio no está registrado en la base.' });
    const created = await transaction.user.create({
      data: {
        firstName: data.firstName,
        ...registrationSurnames(data),
        email: data.email,
        curp: data.curp,
        passwordHash,
        municipality: origin.name,
        municipalityCode: origin.code,
        emailVerifiedAt: new Date(),
        roleId: role.id,
        administrativeStaff: { create: {} },
      },
      select: { id: true },
    });
    await writeAudit(transaction, {
      actorUserId: created.id,
      action: 'staff.bootstrap',
      resourceType: 'User',
      resourceId: created.id,
    });
    return created;
  });
}
