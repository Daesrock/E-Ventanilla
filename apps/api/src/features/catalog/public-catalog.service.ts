import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { normalizeMunicipality } from './municipalities.js';
import { fieldFailure } from '../../core/validation/validation.js';

// Selecciones explícitas: nunca se exponen responsables, cuentas ni credenciales.
const branchSelect = {
  id: true,
  name: true,
  type: true,
  address: true,
  phone: true,
  email: true,
  officeHours: true,
  municipality: { select: { code: true, name: true } },
  sourceUrl: true,
  sourceCheckedAt: true,
} satisfies Prisma.BranchSelect;
const procedureSelect = {
  id: true,
  name: true,
  description: true,
  requirements: true,
  cost: true,
  sourceUrl: true,
  sourceCheckedAt: true,
} satisfies Prisma.ProcedureSelect;

function search<T extends { name: string }>(items: T[], query?: unknown) {
  if (query !== undefined && typeof query !== 'string')
    throw fieldFailure({ q: 'Escribe una sola búsqueda.' });
  if (query && query.length > 120) throw fieldFailure({ q: 'La búsqueda es demasiado larga.' });
  const key = normalizeMunicipality(query ?? '');
  return items
    .filter((item) => !key || normalizeMunicipality(item.name).includes(key))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

@Injectable()
export class PublicCatalogService {
  constructor(private readonly db: DatabaseService) {}

  async branches(query?: unknown) {
    const rows = await this.db.branch.findMany({
      where: { active: true, published: true },
      select: branchSelect,
    });
    return {
      items: search(
        rows.map((row) => ({
          ...row,
          municipality: row.municipality.name,
          municipalityCode: row.municipality.code,
        })),
        query,
      ),
    };
  }

  async branch(id: string) {
    const row = await this.db.branch.findFirst({
      where: { id, active: true, published: true },
      select: branchSelect,
    });
    if (!row) throw new NotFoundException('La sede no está disponible.');
    return { ...row, municipality: row.municipality.name, municipalityCode: row.municipality.code };
  }

  async procedures(query?: unknown) {
    const rows = await this.db.procedure.findMany({
      where: { active: true, published: true },
      select: procedureSelect,
    });
    return {
      items: search(
        rows.map((row) => ({ ...row, cost: row.cost?.toString() ?? null })),
        query,
      ),
    };
  }

  async procedure(id: string) {
    const row = await this.db.procedure.findFirst({
      where: { id, active: true, published: true },
      select: procedureSelect,
    });
    if (!row) throw new NotFoundException('El trámite no está disponible.');
    return { ...row, cost: row.cost?.toString() ?? null };
  }
}
