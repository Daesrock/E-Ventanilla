import { UseFilters } from '@nestjs/common';
import { AdminDatabaseErrors } from './admin.database-errors.js';
/**
 * Identidad administrativa de la sesión: rol, permisos, perfiles y sedes asignadas.
 * No modifica `/v1/auth/me`; los clientes ciudadanos conservan su contrato.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { AdminGuard } from './admin.guard.js';
import { CurrentAdmin } from './admin.decorators.js';
import type { AdminContext } from './admin.types.js';

@Controller('admin')
@UseGuards(AdminGuard)
@UseFilters(AdminDatabaseErrors)
export class AdminController {
  constructor(private readonly db: DatabaseService) {}

  @Get('me')
  async me(@CurrentAdmin() admin: AdminContext) {
    const branches = await this.db.branch.findMany({
      where: admin.allBranches ? {} : { id: { in: admin.branchIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return {
      user: {
        id: admin.user.id,
        firstName: admin.user.firstName,
        lastName: admin.user.lastName,
        paternalLastName: admin.user.paternalLastName,
        maternalLastName: admin.user.maternalLastName,
        email: admin.user.email,
        emailVerifiedAt: admin.user.emailVerifiedAt?.toISOString() ?? null,
      },
      role: admin.role,
      permissions: [...admin.permissions].sort(),
      scope: { allBranches: admin.allBranches, branches },
      profiles: admin.staffProfiles,
    };
  }
}
