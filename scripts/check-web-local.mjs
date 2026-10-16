/** Prueba integrada web/BFF/API/BD exclusivamente local: login, alcance, oferta, responsables y exportación. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from '../apps/web/server/app.ts';

const access = JSON.parse(
  readFileSync(new URL('../.tools/web-local-access.json', import.meta.url), 'utf8'),
);
const config = {
  apiBaseUrl: 'http://127.0.0.1:3000/v1/',
  appOrigin: 'http://127.0.0.1:5173',
  production: false,
  port: 0,
};
const server = createApp(config).listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/bff/`;
let cookie;
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: config.appOrigin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (path === 'auth/login' && response.ok) {
    const cookies = response.headers.getSetCookie();
    cookie = cookies.find((value) => value.includes('Path=/bff;'))?.split(';')[0];
    assert.ok(cookie, 'Cookie administrativa ausente');
  }
  const data = response.headers.get('content-type')?.includes('text/csv')
    ? await response.text()
    : await response.json();
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`,
  );
  return data;
}
try {
  const account = access.accounts.find((item) => item.role === 'DEPARTMENT_HEAD');
  await request('auth/login', 'POST', { identifier: account.email, password: account.password });
  const me = await request('admin/me');
  assert.equal(me.role.code, 'DEPARTMENT_HEAD');
  const branches = await request('admin/branches');
  const branch = branches.items.find((item) => item.sourceKey === 'web-local-fixture');
  assert.ok(branch);
  await request(`admin/branches/${branch.id}`, 'PATCH', {
    address: 'Domicilio de prueba actualizado localmente',
  });
  assert.equal(
    (await request('admin/branches')).items.find((item) => item.id === branch.id).address,
    'Domicilio de prueba actualizado localmente',
  );
  await request(`admin/branches/${branch.id}`, 'PATCH', { address: branch.address });
  const staff = await request('admin/staff?pageSize=100');
  const head = staff.items.find((item) => item.email === 'ventanilla@local.example');
  assert.ok(head);
  await request(`admin/branches/${branch.id}/head`, 'PATCH', { counterHeadId: head.id });
  assert.equal(
    (await request('admin/branches')).items.find((item) => item.id === branch.id).counterHeadId,
    head.id,
  );
  await request(`admin/branches/${branch.id}/head`, 'PATCH', {
    counterHeadId: branch.counterHeadId,
  });
  const offers = await request(`admin/branches/${branch.id}/procedures`);
  assert.ok(offers.items.length);
  const item = offers.items[0];
  await request(`admin/branches/${branch.id}/procedures`, 'PATCH', {
    items: [{ procedureId: item.procedureId, active: !item.active }],
  });
  assert.equal(
    (await request(`admin/branches/${branch.id}/procedures`)).items.find(
      (offer) => offer.procedureId === item.procedureId,
    ).active,
    !item.active,
  );
  await request(`admin/branches/${branch.id}/procedures`, 'PATCH', {
    items: [{ procedureId: item.procedureId, active: item.active }],
  });
  const slots = await request(
    `admin/branches/${branch.id}/time-slots?from=2030-01-02&to=2030-01-02`,
  );
  let slot = slots.items[0];
  if (!slot)
    slot = await request(`admin/branches/${branch.id}/time-slots`, 'POST', {
      date: '2030-01-02',
      startsAt: '09:00',
      endsAt: '10:00',
      capacity: 5,
    });
  await request(`admin/time-slots/${slot.id}`, 'PATCH', { capacity: 6, active: false });
  const catalog = await request('admin/procedures');
  let procedure = catalog.items.find((item) => item.sourceKey === 'web-local-smoke-procedure');
  if (!procedure)
    procedure = await request('admin/procedures', 'POST', {
      name: 'Trámite de integración local',
      cost: null,
      published: false,
      sourceKey: 'web-local-smoke-procedure',
    });
  assert.equal(
    (await request(`admin/procedures/${procedure.id}`, 'PATCH', { cost: null })).cost,
    null,
  );
  assert.equal(
    Number((await request(`admin/procedures/${procedure.id}`, 'PATCH', { cost: 0 })).cost),
    0,
  );
  await request('admin/appointments?from=2030-01-01&to=2030-01-31');
  const report = await request('admin/reports?from=2030-01-01&to=2030-01-31');
  assert.equal(typeof report.summary.appointments, 'number');
  assert.match(
    await request('admin/reports/export.csv?from=2030-01-01&to=2030-01-31&columns=folio'),
    /FOLIO/,
  );
  await request(`admin/branches/${branch.id}/counters`);
  await request('auth/logout', 'POST');
  console.info(
    'Integración local aprobada: login, permisos, edición de sede, responsable, oferta persistida, horarios, alta/edición de catálogo (costo null y cero), citas, reportes, CSV y mostradores.',
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
