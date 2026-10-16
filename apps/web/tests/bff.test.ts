/** Pruebas BFF contra upstream simulado: origen, cookies, tokens opacos y revocación. */
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import type { ServerConfig } from '../server/config';
import { SessionStore } from '../server/session-store';

const config: ServerConfig = {
  apiBaseUrl: 'https://api.ejemplo.invalid/v1/',
  appOrigin: 'http://127.0.0.1:5173',
  production: false,
  port: 3001,
};
const loginBody = {
  token: 'TOKEN_OPACO_REAL_NO_PUBLICO',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: {
    id: 'person',
    firstName: 'Ejemplo',
    email: 'ejemplo@ejemplo.invalid',
    passwordHash: 'NO_PUBLICAR',
  },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('BFF de sesiones', () => {
  it('reenvía PATCH administrativo con cookie /bff, token privado y errores de campo', async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(loginBody))
      .mockResolvedValueOnce(
        json(
          {
            message: 'Revisa los campos indicados.',
            code: 'VALIDATION_ERROR',
            fieldErrors: { capacity: 'No puede ser menor a la ocupación.' },
          },
          400,
        ),
      );
    const agent = request.agent(createApp(config, upstream));
    const login = await agent
      .post('/bff/auth/login')
      .set('Origin', config.appOrigin)
      .send({ identifier: 'example', password: 'pass' });
    expect(String(login.headers['set-cookie'])).toContain('Path=/bff;');
    const id = '11111111-1111-4111-8111-111111111111';
    const result = await agent
      .patch(`/bff/admin/time-slots/${id}`)
      .set('Origin', config.appOrigin)
      .send({ capacity: 2 });
    expect(result.status).toBe(400);
    expect(result.body.fieldErrors.capacity).toContain('ocupación');
    expect(result.body.code).toBe('VALIDATION_ERROR');
    expect(upstream.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: `Bearer ${loginBody.token}`,
    });
    expect(upstream.mock.calls[1][1]?.body).toBe('{"capacity":2}');
    expect(JSON.stringify(result.body)).not.toContain(loginBody.token);
  });
  it('bloquea PATCH sin origen y rutas administrativas fuera de allowlist', async () => {
    const upstream = vi.fn<typeof fetch>();
    const app = createApp(config, upstream);
    const id = '11111111-1111-4111-8111-111111111111';
    expect((await request(app).patch(`/bff/admin/branches/${id}`).send({ name: 'x' })).status).toBe(
      403,
    );
    expect((await request(app).get('/bff/admin/permissions')).status).toBe(404);
    expect((await request(app).get('/bff/admin/branches')).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('conserva filtros, paginación y respuesta CSV en sesión administrativa', async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(loginBody))
      .mockResolvedValueOnce(json({ items: [], pagination: { page: 2, total: 0 } }))
      .mockResolvedValueOnce(
        new Response('FOLIO\r\nA-1\r\n', { headers: { 'Content-Type': 'text/csv' } }),
      );
    const agent = request.agent(createApp(config, upstream));
    await agent
      .post('/bff/auth/login')
      .set('Origin', config.appOrigin)
      .send({ identifier: 'example', password: 'pass' });
    const staff = await agent.get('/bff/admin/staff?page=2&pageSize=25');
    expect(staff.body.pagination.page).toBe(2);
    expect(String(upstream.mock.calls[1][0])).toContain('staff?page=2&pageSize=25');
    const csv = await agent.get('/bff/admin/reports/export.csv?from=2026-10-01&to=2026-10-31');
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('A-1');
  });
  it('rechaza POST sin origen permitido antes de consultar API', async () => {
    const upstream = vi.fn<typeof fetch>();
    const res = await request(createApp(config, upstream))
      .post('/bff/auth/login')
      .set('Origin', 'https://ajeno.invalid')
      .send({ identifier: 'example', password: 'pass' });
    expect(res.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('guarda token en servidor y retorna cookie independiente; filtra campos privados', async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(loginBody))
      .mockResolvedValueOnce(json(loginBody.user));
    const agent = request.agent(createApp(config, upstream));
    const login = await agent
      .post('/bff/auth/login')
      .set('Origin', config.appOrigin)
      .send({ identifier: 'example', password: 'pass' });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ administrativeAccess: false, user: { id: 'person' } });
    expect(JSON.stringify(login.body)).not.toContain(loginBody.token);
    expect(JSON.stringify(login.body)).not.toContain('NO_PUBLICAR');
    expect(String(login.headers['set-cookie'])).toContain('HttpOnly');
    expect(String(login.headers['set-cookie'])).toContain('SameSite=Strict');
    expect(String(login.headers['set-cookie'])).not.toContain(loginBody.token);
    expect((await agent.get('/bff/auth/me')).status).toBe(200);
    expect(upstream.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: `Bearer ${loginBody.token}`,
    });
  });
  it('no publica endpoints administrativos ni hace proxy de rutas arbitrarias', async () => {
    const upstream = vi.fn<typeof fetch>();
    const app = createApp(config, upstream);
    expect((await request(app).get('/bff/administration/users')).status).toBe(404);
    expect(
      (await request(app).post('/bff/auth/register').set('Origin', config.appOrigin).send({}))
        .status,
    ).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('elimina sesión local aunque revocación remota falle y comunica resultado', async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(loginBody))
      .mockRejectedValueOnce(new Error('offline'));
    const agent = request.agent(createApp(config, upstream));
    await agent
      .post('/bff/auth/login')
      .set('Origin', config.appOrigin)
      .send({ identifier: 'example', password: 'pass' });
    const logout = await agent.post('/bff/auth/logout').set('Origin', config.appOrigin);
    expect(logout.status).toBe(502);
    expect(logout.body.message).toContain('Sesión web cerrada');
    expect((await agent.get('/bff/auth/me')).status).toBe(401);
  });
  it('sesiones vencidas nunca se recuperan del almacén', () => {
    const store = new SessionStore();
    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(1000);
      const id = store.create('opaque', 2000);
      clock.mockReturnValue(2001);
      expect(store.get(id)).toBeUndefined();
    } finally {
      clock.mockRestore();
    }
  });
});
