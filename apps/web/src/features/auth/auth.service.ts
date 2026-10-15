/** Sesiones reales mediante BFF; ninguna respuesta entrega token al navegador. */
import { apiRequest } from '../../services/api/client';

export interface ApiIdentity {
  user: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    emailVerifiedAt?: string | null;
  };
  expiresAt: string;
  administrativeAccess: false;
}
export const apiLogin = (identifier: string, password: string) =>
  apiRequest<ApiIdentity>('auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
export const apiMe = () => apiRequest<ApiIdentity>('auth/me');
export const apiLogout = () => apiRequest<{ message: string }>('auth/logout', { method: 'POST' });
