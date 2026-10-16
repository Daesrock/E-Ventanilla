/**
 * Guard de rutas administrativas: autentica la sesión, resuelve rol/permiso/alcance
 * desde la base y exige los permisos declarados con @RequirePermission.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { bearerToken, AdminAuthService } from './admin.auth.js';
import { PERMISSIONS_KEY } from './admin.decorators.js';
import type { AdminContext } from './admin.types.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly admin: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      admin?: AdminContext;
    }>();
    const admin = await this.admin.authenticate(bearerToken(request.headers.authorization));
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.some((code) => !admin.permissions.has(code)))
      throw new ForbiddenException({
        message: 'No cuentas con permiso para esta operación administrativa.',
        code: 'ADMIN_PERMISSION_REQUIRED',
      });
    request.admin = admin;
    return true;
  }
}
