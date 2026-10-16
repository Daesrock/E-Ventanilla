/**
 * Autorización administrativa: identidad, rol, permisos y alcance de sedes se
 * resuelven siempre en la base con la sesión vigente; nunca se confía en el cliente.
 */
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { SessionService } from '../sessions/session.service.js';
import type { AdminContext } from './admin.types.js';

const ADMIN_ROLES = ['ROOT', 'DEPARTMENT_HEAD', 'COUNTER_HEAD'];

export function bearerToken(header?: string) {
  if (!header?.startsWith('Bearer '))
    throw new UnauthorizedException('Inicia sesión para continuar.');
  return header.slice(7);
}

export function assertBranchScope(admin: AdminContext, branchId: string) {
  if (
    !admin.allBranches &&
    !admin.branchIds.some((id) => id.toLowerCase() === branchId.toLowerCase())
  )
    throw new ForbiddenException({
      message: 'La sede no está dentro de tu alcance.',
      code: 'BRANCH_OUT_OF_SCOPE',
    });
}

@Injectable()
export class AdminAuthService {
  private readonly sessions: SessionService;

  constructor(private readonly db: DatabaseService) {
    this.sessions = new SessionService(db);
  }

  async authenticate(token: string): Promise<AdminContext> {
    const session = await this.sessions.authenticate(token, true);
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: {
        role: {
          include: { permissions: { include: { permission: { select: { code: true } } } } },
        },
        administrativeStaff: {
          include: {
            counterStaff: { select: { userId: true } },
            counterHead: { select: { userId: true } },
            departmentHead: { select: { userId: true } },
          },
        },
      },
    });
    if (!user.active) throw new UnauthorizedException('La sesión no está disponible.');
    if (!user.role.active || !ADMIN_ROLES.includes(user.role.code) || !user.administrativeStaff)
      throw new ForbiddenException({
        message: 'La cuenta no tiene acceso al panel administrativo.',
        code: 'ADMIN_ACCESS_REQUIRED',
      });
    const allBranches = user.role.code === 'ROOT' || user.role.code === 'DEPARTMENT_HEAD';
    const branchIds = allBranches
      ? []
      : (
          await this.db.branch.findMany({
            where: { counterHeadId: user.id },
            select: { id: true },
          })
        ).map((branch) => branch.id);
    return {
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        paternalLastName: user.paternalLastName,
        maternalLastName: user.maternalLastName,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        active: user.active,
      },
      role: {
        code: user.role.code,
        name: user.role.name,
        hierarchyLevel: user.role.hierarchyLevel,
      },
      permissions: new Set(user.role.permissions.map((entry) => entry.permission.code)),
      allBranches,
      branchIds,
      staffProfiles: {
        counterStaff: !!user.administrativeStaff.counterStaff,
        counterHead: !!user.administrativeStaff.counterHead,
        departmentHead: !!user.administrativeStaff.departmentHead,
      },
    };
  }
}
