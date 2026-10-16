import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PublicCatalogService } from '../dist/features/catalog/public-catalog.service.js';
import { PublicCatalogController } from '../dist/features/catalog/public-catalog.controller.js';
import { municipalityCatalog } from '../dist/features/catalog/municipalities.js';

// Datos técnicos aislados en memoria. Nunca se insertan en la base del VPS.
function fixture() {
  const id = randomUUID();
  const branch = {
    id,
    name: 'Sede técnica · Comitán',
    municipality: { name: 'Comitán de Domínguez', code: '07019' },
    address: null,
  };
  const procedure = { id, name: 'Trámite técnico', cost: null, requirements: null };
  const calls = [];
  const table = (row) => ({
    findMany: async (request) => {
      calls.push(request);
      return [row];
    },
    findFirst: async (request) => {
      calls.push(request);
      return request.where.id === id ? row : null;
    },
  });
  return {
    service: new PublicCatalogService({ branch: table(branch), procedure: table(procedure) }),
    calls,
    id,
    branch,
  };
}

test('coordenadas públicas: publica pares válidos como números, sin sustituir ausencias por cero', async () => {
  const { service, branch, id } = fixture();
  const missing = await service.branch(id);
  assert.equal(missing.latitude, null);
  assert.equal(missing.longitude, null);
  branch.latitude = '0';
  branch.longitude = '0';
  const detail = await service.branch(id);
  assert.equal(detail.latitude, 0);
  assert.equal(detail.longitude, 0);
  branch.latitude = '14.5';
  branch.longitude = '-92.5';
  const listed = (await service.branches()).items[0];
  assert.equal(listed.latitude, 14.5);
  assert.equal(listed.longitude, -92.5);
});

test('omite ambos componentes si el par de coordenadas está incompleto o fuera de rango', async () => {
  const { service, branch, id } = fixture();
  for (const [latitude, longitude] of [
    [null, -92],
    [15, null],
    [91, -92],
    [15, -181],
    [NaN, 0],
    [0, Infinity],
  ]) {
    branch.latitude = latitude;
    branch.longitude = longitude;
    const result = await service.branch(id);
    assert.equal(result.latitude, null);
    assert.equal(result.longitude, null);
  }
});

test('solo consulta registros activos publicados y selecciona campos públicos explícitos', async () => {
  const { service, calls } = fixture();
  const result = await service.branches();
  assert.equal(result.items[0].municipality, 'Comitán de Domínguez');
  assert.equal(result.items[0].address, null);
  await service.procedures();
  for (const { where, select } of calls) {
    assert.deepEqual(where, { active: true, published: true });
    assert.equal(select.passwordHash, undefined);
    assert.equal(select.staff, undefined);
    assert.equal(select.sourceUrl, true);
    assert.equal(select.sourceCheckedAt, true);
  }
});

test('búsqueda sin acentos o mayúsculas y ausencia de coincidencias', async () => {
  const { service } = fixture();
  assert.equal((await service.branches('COMITAN')).items.length, 1);
  assert.equal((await service.branches('comitán')).items.length, 1);
  assert.equal((await service.branches('sin coincidencias')).items.length, 0);
  assert.equal((await service.procedures('tramite')).items.length, 1);
});

test('rechaza búsquedas excesivas y parámetros repetidos en lugar de fallar con 500', async () => {
  const { service } = fixture();
  for (const query of ['x'.repeat(121), ['a', 'b'], { key: 'a' }]) {
    await assert.rejects(service.branches(query), (error) => error.getStatus() === 400);
  }
});

test('un detalle ausente no revela información; costo desconocido no significa gratuito', async () => {
  const { service, calls, id } = fixture();
  assert.equal((await service.procedure(id)).cost, null);
  await assert.rejects(service.branch(randomUUID()), (error) => error.getStatus() === 404);
  await assert.rejects(service.procedure(randomUUID()), (error) => error.getStatus() === 404);
  assert.ok(calls.every(({ where }) => where.active && where.published));
});

test('HTTP público: listas, detalles, búsqueda, UUID inválido y parámetros repetidos', async () => {
  const { service, id } = fixture();
  class TestModule {}
  Module({
    controllers: [PublicCatalogController],
    providers: [{ provide: PublicCatalogService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    for (const path of ['branches', 'procedures']) {
      assert.equal((await fetch(`${base}/v1/catalog/${path}`)).status, 200);
      assert.equal((await fetch(`${base}/v1/catalog/${path}/${id}`)).status, 200);
      assert.equal((await fetch(`${base}/v1/catalog/${path}/invalid`)).status, 400);
      assert.equal((await fetch(`${base}/v1/catalog/${path}/${randomUUID()}`)).status, 404);
      assert.equal((await fetch(`${base}/v1/catalog/${path}?q=a&q=b`)).status, 400);
    }
    const response = await fetch(`${base}/v1/catalog/branches?q=COMITAN`);
    assert.equal((await response.json()).items.length, 1);
  } finally {
    await app.close();
  }
});

test('instantánea institucional: municipios válidos, procedencia consistente y ausencia de datos inventados', () => {
  const data = JSON.parse(
    readFileSync(
      new URL('../../../database/catalog/coesa-2026-10-11.json', import.meta.url),
      'utf8',
    ),
  );
  const codes = new Set(municipalityCatalog.municipalities.map((item) => item.code));
  const keys = new Set();
  for (const item of [...data.branches, ...data.procedures]) {
    assert.ok(!keys.has(item.sourceKey));
    keys.add(item.sourceKey);
    assert.ok(
      data.sources.some(
        (source) => source.url === item.sourceUrl && source.sha256 === item.sourceSha256,
      ),
    );
    assert.match(item.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isFinite(Date.parse(item.sourceCheckedAt)));
    assert.equal(item.passwordHash, undefined);
    if (item.municipalityCode) assert.ok(codes.has(item.municipalityCode));
  }
  assert.ok(data.branches.length > 0 && data.procedures.length > 0);
  assert.ok(data.procedures.every((item) => item.requirements === null && item.cost === null));
  const ambiguous = data.branches.find((item) => item.sourceKey === 'coesa:469:VIM:07089');
  assert.equal(ambiguous.address, null);
  assert.equal(ambiguous.phone, null);
  assert.equal(ambiguous.email, null);
});
