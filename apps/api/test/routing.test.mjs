import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OsrmClient } from '../dist/features/routing/osrm.client.js';
import { BranchRoutingService } from '../dist/features/routing/branch-routing.service.js';
import { BranchRoutingController } from '../dist/features/routing/branch-routing.controller.js';
import { validationFailure } from '../dist/core/validation/validation.js';

// Puntos técnicos en memoria: no representan sedes ni se guardan en PostgreSQL.
const origin = { latitude: 14, longitude: -92 };
const destinations = [
  { id: randomUUID(), latitude: 15, longitude: -93 },
  { id: randomUUID(), latitude: 16, longitude: -94 },
];
function transport(options = {}) {
  const calls = [];
  const request = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, body });
    if (options.fail) return new Response('{}', { status: 503 });
    const data = url.pathname.startsWith('/nearest')
      ? {
          code: 'Ok',
          waypoints: body.coordinates.map((point, index) =>
            options.unmatched?.includes(index)
              ? { code: 'NoSegment' }
              : [{ distance: 0, location: point }],
          ),
        }
      : { code: 'Ok', distances: [[2000, 1000]], durations: [[120, 240]], ...options.matrix };
    return Response.json(data);
  };
  return { calls, client: new OsrmClient('http://private-osrm:5000', request) };
}

test('rutas: POST privado, coordenadas longitud/latitud y resultados del motor sin cálculo en línea recta', async () => {
  const { client, calls } = transport();
  const routes = await client.routes(origin, destinations);
  assert.deepEqual(routes, [
    { branchId: destinations[0].id, distanceMeters: 2000, durationSeconds: 120 },
    { branchId: destinations[1].id, distanceMeters: 1000, durationSeconds: 240 },
  ]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].url.pathname, '/nearest/v1/driving');
  assert.equal(calls[0].url.search, '');
  assert.deepEqual(calls[0].body.coordinates[0], [-92, 14]);
  assert.deepEqual(calls[0].body.radiuses, [5000, 250, 250]);
  assert.equal(calls[1].body.fallback_speed, undefined);
  assert.equal(calls[0].init.signal, calls[1].init.signal);
  assert.equal(calls[0].init.redirect, 'error');
});

test('rutas: un destino sin acceso al grafo no impide calcular los demás', async () => {
  const { client } = transport({
    unmatched: [1],
    matrix: { distances: [[1000]], durations: [[240]] },
  });
  assert.deepEqual(await client.routes(origin, destinations), [
    { branchId: destinations[1].id, distanceMeters: 1000, durationSeconds: 240 },
  ]);
  const outside = transport({ unmatched: [0] });
  assert.deepEqual(await outside.client.routes(origin, destinations), []);
  assert.equal(outside.calls.length, 1);
});

test('rutas: los recorridos ausentes no reciben números inventados y cero sigue siendo válido', async () => {
  const { client } = transport({ matrix: { distances: [[null, 0]], durations: [[null, 0]] } });
  assert.deepEqual(await client.routes(origin, destinations), [
    { branchId: destinations[1].id, distanceMeters: 0, durationSeconds: 0 },
  ]);
  for (const matrix of [
    { distances: null },
    { durations: [[120]] },
    { fallback_speed_cells: [[0, 0]] },
  ])
    assert.equal(await transport({ matrix }).client.routes(origin, destinations), null);
});

test('rutas: servicio apagado, errores y espera máxima permiten volver a la selección manual', async () => {
  assert.equal(await new OsrmClient('').routes(origin, destinations), null);
  assert.equal(await transport({ fail: true }).client.routes(origin, destinations), null);
  let cancelled = false;
  const pending = new OsrmClient(
    'http://private-osrm:5000',
    (_, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            cancelled = true;
            reject(new Error('Cancelado'));
          },
          { once: true },
        );
      }),
    10,
  );
  assert.equal(await pending.routes(origin, destinations), null);
  assert.equal(cancelled, true);
  for (const url of [
    'file:///etc/passwd',
    'http://user:password@host',
    'http://host/path',
    'http://host/?url=other',
  ]) {
    assert.throws(() => new OsrmClient(url));
  }
});

test('sedes: solo calcula destinos publicados y ordena por tiempo, no por distancia', async () => {
  let selection;
  const db = {
    branch: {
      findMany: async (query) => {
        selection = query;
        return destinations;
      },
    },
  };
  const osrm = {
    routes: async () => [
      { branchId: destinations[1].id, distanceMeters: 1000, durationSeconds: 240 },
      { branchId: destinations[0].id, distanceMeters: 2000, durationSeconds: 120 },
    ],
  };
  const service = new BranchRoutingService(db, osrm);
  const ids = destinations.map((item) => item.id);
  const result = await service.nearby({ ...origin, branchIds: ids });
  assert.deepEqual(selection.where, { id: { in: ids }, active: true, published: true });
  assert.deepEqual(Object.keys(selection.select).sort(), ['id', 'latitude', 'longitude']);
  assert.equal(result.items[0].branchId, destinations[0].id);
  assert.equal(result.trafficIncluded, false);
  assert.equal(result.travelMode, 'driving');
  assert.equal(result.latitude, undefined);
});

test('sedes: distingue falta de coordenadas y motor no disponible sin modificar registros', async () => {
  const calls = [];
  const db = {
    branch: { findMany: async () => [{ id: randomUUID(), latitude: null, longitude: 0 }] },
  };
  const service = new BranchRoutingService(db, {
    routes: async (...args) => {
      calls.push(args);
      return null;
    },
  });
  assert.deepEqual(await service.nearby({ ...origin, branchIds: [randomUUID()] }), {
    status: 'no_coordinates',
    items: [],
  });
  assert.equal(calls.length, 0);
  db.branch.findMany = async () => destinations;
  assert.deepEqual(
    await service.nearby({ ...origin, branchIds: destinations.map((item) => item.id) }),
    { status: 'unavailable', items: [] },
  );
});

async function server(limited) {
  class TestModule {}
  let requests = 0;
  Module({
    imports: limited ? [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])] : [],
    controllers: [BranchRoutingController],
    providers: [
      {
        provide: BranchRoutingService,
        useValue: {
          nearby: async () => {
            requests++;
            return { status: 'no_coordinates', items: [] };
          },
        },
      },
      ...(limited ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }] : []),
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationFailure,
    }),
  );
  await app.listen(0, '127.0.0.1');
  const url = `${await app.getUrl()}/v1/catalog/branches/nearby`;
  const post = (body) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  return { app, post, count: () => requests };
}

test('HTTP de rutas: valida coordenadas y UUID, rechaza destinos arbitrarios y no cachea ubicación', async () => {
  const { app, post, count } = await server(false);
  const body = { ...origin, branchIds: [randomUUID()] };
  try {
    for (const invalid of [
      { ...body, latitude: '14' },
      { ...body, longitude: 181 },
      { ...body, latitude: -91 },
      { ...body, branchIds: [] },
      { ...body, branchIds: ['invalid'] },
      { ...body, branchIds: Array.from({ length: 51 }, randomUUID) },
      { ...body, branchIds: [body.branchIds[0], body.branchIds[0]] },
      { ...body, url: 'http://other/' },
      { ...body, destinations: [[1, 2]] },
    ])
      assert.equal((await post(invalid)).status, 400);
    assert.equal(count(), 0);
    const response = await post(body);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(count(), 1);
  } finally {
    await app.close();
  }
});

test('HTTP de rutas: máximo doce consultas por minuto por cliente', async () => {
  const { app, post, count } = await server(true);
  try {
    for (let index = 0; index < 12; index++)
      assert.equal((await post({ ...origin, branchIds: [randomUUID()] })).status, 200);
    assert.equal((await post({ ...origin, branchIds: [randomUUID()] })).status, 429);
    assert.equal(count(), 12);
  } finally {
    await app.close();
  }
});
