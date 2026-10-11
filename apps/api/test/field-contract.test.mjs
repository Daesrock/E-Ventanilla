import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto, VerifyDto } from '../dist/features/auth/auth.dto.js';
import { passwordError } from '../dist/features/auth/password-policy.js';

const contract = JSON.parse(
  readFileSync(new URL('../../../contracts/auth-fields.json', import.meta.url)),
);
test('contrato compartido de CURP, teléfono, RFC, código y Unicode', async () => {
  for (const item of contract.validation) {
    const value = item.field === 'rfc' && item.value === '' ? undefined : item.value;
    const Dto = item.field === 'code' ? VerifyDto : RegisterDto;
    const errors = await validate(plainToInstance(Dto, { [item.field]: value }));
    assert.equal(
      !errors.some((error) => error.property === item.field),
      item.valid,
      `${item.field}: ${JSON.stringify(item.value)}`,
    );
  }
  for (const item of contract.passwords)
    assert.equal(!passwordError(item.value), item.valid, JSON.stringify(item.value));
});
