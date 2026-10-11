import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const collection = JSON.parse(readFileSync(new URL('./E-Ventanilla.postman_collection.json', import.meta.url), 'utf8'));
const requests = collection.item.flatMap(folder => folder.item);
const get = path => requests.find(item => item.request.url.endsWith(path));
function sandbox(values = {}, response = {}) {
  const store = new Map(Object.entries(values));
  let skipped = false;
  return {
    pm: { variables: { get: key => store.get(key), set: (key, value) => store.set(key, value) },
      collectionVariables: { set: (key, value) => store.set(key, value) },
      execution: { skipRequest() { skipped = true; throw new Error('skipped'); } },
      response: { code: response.status ?? 200, json: () => response.body ?? {} } },
    store, get skipped() { return skipped; },
  };
}
function run(item, phase, pm) {
  for (const event of item.event ?? []) if (event.listen === phase) new Function('pm', event.script.exec.join('\n'))(pm);
}

test('plantillas de operaciones reales se omiten sin autorización local y sin datos', () => {
  for (const item of collection.item[2].item) {
    const context = sandbox();
    assert.throws(() => run(item, 'prerequest', context.pm));
    assert.equal(context.skipped, true);
    assert.equal(context.store.has('requestBody'), false);
  }
  const context = sandbox({ allowRealWrites: 'true' });
  assert.throws(() => run(get('auth/register'), 'prerequest', context.pm));
  assert.equal(context.skipped, true);
});

test('login construye JSON válido y conserva contraseña Unicode, comillas y ceros de código', () => {
  const password = '"Clave🪻SinRecortar';
  const login = sandbox({ identifier: 'isolated', password });
  run(get('auth/login'), 'prerequest', login.pm);
  const body = JSON.parse(login.store.get('requestBody'));
  assert.equal(body.password, password);
  assert.equal(body.allowPendingVerification, true);
  const verification = sandbox({ allowRealWrites: 'true', email: 'isolated', code: '00001234' });
  run(get('auth/verify-email'), 'prerequest', verification.pm);
  assert.equal(JSON.parse(verification.store.get('requestBody')).code, '00001234');
});

test('plantillas capturan sesión y seguimiento separados; 403 no crea una sesión', () => {
  const login = sandbox({}, { body: { token: 'isolated-session', verification: { trackingToken: 'isolated-tracking' } } });
  run(get('auth/login'), 'test', login.pm);
  assert.equal(login.store.get('sessionToken'), 'isolated-session');
  assert.equal(login.store.get('trackingToken'), 'isolated-tracking');
  const pending = sandbox({}, { status: 403, body: { email: 'isolated', verification: { trackingToken: 'isolated-pending' } } });
  run(get('auth/login'), 'test', pending.pm);
  assert.equal(pending.store.get('sessionToken'), '');
  assert.equal(pending.store.get('trackingToken'), 'isolated-pending');
  const verified = sandbox({ trackingToken: 'stale' }, { body: { token: 'new-session' } });
  run(get('auth/login'), 'test', verified.pm);
  assert.equal(verified.store.get('trackingToken'), '');
});

test('el paso de código conserva ceros iniciales y no solicita una contraseña', () => {
  const context = sandbox({ allowRealWrites: 'true', identifier: 'isolated', code: '00001234' });
  run(get('auth/verify-reset-code'), 'prerequest', context.pm);
  assert.deepEqual(JSON.parse(context.store.get('requestBody')), { identifier: 'isolated', code: '00001234' });
});
