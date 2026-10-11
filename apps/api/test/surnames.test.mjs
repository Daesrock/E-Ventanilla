import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../dist/features/auth/auth.dto.js';
import { registrationSurnames } from '../dist/features/auth/surnames.js';
import { publicUser } from '../dist/features/auth/public-user.js';

async function surnameErrors(input) {
  const data = plainToInstance(RegisterDto, input);
  const errors = (await validate(data)).filter((error) =>
    ['lastName', 'paternalLastName', 'maternalLastName'].includes(error.property),
  );
  return { data, errors };
}

test('apellidos compuestos se conservan separados y sin cambiar su escritura', async () => {
  const { data, errors } = await surnameErrors({
    paternalLastName: ' de la Cruz ',
    maternalLastName: ' O’Neill ',
  });
  assert.equal(errors.length, 0);
  assert.deepEqual(registrationSurnames(data), {
    paternalLastName: 'de la Cruz',
    maternalLastName: 'O’Neill',
    lastName: 'de la Cruz O’Neill',
  });
});

test('el apellido materno puede omitirse o dejarse vacío', async () => {
  for (const maternalLastName of [undefined, '', '   ', null]) {
    const { data, errors } = await surnameErrors({
      paternalLastName: 'Apellido',
      maternalLastName,
    });
    assert.equal(errors.length, 0);
    assert.deepEqual(registrationSurnames(data), {
      paternalLastName: 'Apellido',
      maternalLastName: null,
      lastName: 'Apellido',
    });
  }
});

test('paterno obligatorio y límites de 100 caracteres por apellido', async () => {
  for (const input of [
    {},
    { paternalLastName: '' },
    { maternalLastName: 'Apellido' },
    { paternalLastName: null },
  ]) {
    assert.ok(
      (await surnameErrors(input)).errors.some((error) => error.property === 'paternalLastName'),
    );
  }
  for (const field of ['paternalLastName', 'maternalLastName']) {
    for (const value of ['á', '🪻']) {
      assert.equal(
        (await surnameErrors({ paternalLastName: 'Apellido', [field]: value.repeat(100) })).errors
          .length,
        0,
      );
      assert.ok(
        (
          await surnameErrors({ paternalLastName: 'Apellido', [field]: value.repeat(101) })
        ).errors.some((error) => error.property === field),
      );
    }
  }
});

test('cliente anterior conserva apellidos sin deducir cuáles son paternos o maternos', async () => {
  const { data, errors } = await surnameErrors({ lastName: 'De la Cruz Del Río' });
  assert.equal(errors.length, 0);
  assert.deepEqual(registrationSurnames(data), {
    lastName: 'De la Cruz Del Río',
    paternalLastName: null,
    maternalLastName: null,
  });
  assert.throws(
    () => registrationSurnames({ lastName: 'Anterior', paternalLastName: 'Nuevo' }),
    (error) => error.getStatus() === 400,
  );
});

test('respuesta pública incluye ambos apellidos sin credenciales', () => {
  const result = publicUser({
    firstName: 'Fixture',
    ...registrationSurnames({ paternalLastName: 'de la Cruz', maternalLastName: 'Del Río' }),
    passwordHash: 'isolated-secret',
  });
  assert.equal(result.paternalLastName, 'de la Cruz');
  assert.equal(result.maternalLastName, 'Del Río');
  assert.equal(result.lastName, 'de la Cruz Del Río');
  assert.equal(Object.hasOwn(result, 'passwordHash'), false);
});
