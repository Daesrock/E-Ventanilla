/**
 * Sesiones reales de API guardadas en memoria del BFF, con ID web independiente.
 * Cookie nunca contiene token API. El prototipo usa un solo proceso; reiniciar lo vacía.
 */
import { randomBytes } from 'node:crypto';

export interface ApiSession {
  token: string;
  expiresAt: number;
}
export class SessionStore {
  private sessions = new Map<string, ApiSession>();
  create(token: string, expiresAt: number): string {
    this.prune();
    if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
      throw new Error('Sesión API inválida.');
    if (this.sessions.size >= 1000) throw new Error('Capacidad de sesiones alcanzada.');
    const id = randomBytes(32).toString('hex');
    this.sessions.set(id, { token, expiresAt });
    return id;
  }
  get(id: string | undefined): ApiSession | undefined {
    this.prune();
    return id ? this.sessions.get(id) : undefined;
  }
  delete(id: string | undefined): void {
    if (id) this.sessions.delete(id);
  }
  private prune(): void {
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= Date.now()) this.sessions.delete(id);
  }
}
