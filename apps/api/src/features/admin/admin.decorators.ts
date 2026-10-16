/** Decoradores del panel administrativo: permisos requeridos y contexto de la cuenta. */
import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AdminContext } from './admin.types.js';

export const PERMISSIONS_KEY = 'admin.permissions';

/** Exige que el rol de la cuenta incluya todos los códigos indicados. */
export const RequirePermission = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminContext =>
    context.switchToHttp().getRequest<{ admin: AdminContext }>().admin,
);
