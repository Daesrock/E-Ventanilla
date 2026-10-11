import { test, expect } from 'bun:test';
import express from 'express';

test('una cabecera de proxy no suplanta al cliente desde un origen sin confianza', async () => {
  const app = express();
  app.set('trust proxy', ['172.18.0.4']);
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  const server = await new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ip`, {
      headers: { 'X-Forwarded-For': '203.0.113.77', 'CF-Connecting-IP': '203.0.113.88' },
    });
    expect((await response.json()).ip).toBe('127.0.0.1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
