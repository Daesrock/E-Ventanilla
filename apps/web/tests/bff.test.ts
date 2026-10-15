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
