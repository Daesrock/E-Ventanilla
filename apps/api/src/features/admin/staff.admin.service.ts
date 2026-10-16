/**
 * Personal administrativo: consulta, alta transaccional (User + AdministrativeStaff
 * + perfil) y actualización controlada. Nunca reutiliza `auth/register`: las cuentas
 * de personal se crean con correo ya verificado y rol explícito.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { fieldFailure } from '../../core/validation/validation.js';
import { hashPassword } from '../../core/security/crypto.js';
import { requireNewPassword } from '../auth/password-policy.js';
import { resolveMunicipality } from '../catalog/municipalities.js';
import { writeAudit } from './admin.audit.js';
import { optionalText, pageParams, personName, providedFields } from './admin.shared.js';
import type { AdminContext } from './admin.types.js';
import type { StaffCreateDto, StaffUpdateDto } from './admin.dto.js';

const STAFF_ROLES = ['ROOT', 'DEPARTMENT_HEAD', 'COUNTER_HEAD', 'COUNTER_STAFF'];

const staffSelect = {
  id: true,
  firstName: true,
  paternalLastName: true,
  maternalLastName: true,
  lastName: true,
  email: true,
  curp: true,
  phone: true,
  active: true,
  emailVerifiedAt: true,
  createdAt: true,
  role: { select: { code: true, name: true } },
  administrativeStaff: {
    select: {
      street: true,
      exteriorNumber: true,
      interiorNumber: true,
      neighborhood: true,
      postalCode: true,
      socialSecurityNumber: true,
      counterStaff: { select: { userId: true } },
      counterHead: { select: { userId: true, branches: { select: { id: true, name: true } } } },
      departmentHead: { select: { userId: true } },
    },
  },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof staffSelect }>;

function present(row: StaffRow) {
  const staff = row.administrativeStaff;
  return {
    id: row.id,
    name: personName(row),
    firstName: row.firstName,
    paternalLastName: row.paternalLastName,
    maternalLastName: row.maternalLastName,
    email: row.email,
    curp: row.curp,
    phone: row.phone,
    active: row.active,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    role: row.role,
    profiles: {
      counterStaff: !!staff?.counterStaff,
      counterHead: !!staff?.counterHead,
      departmentHead: !!staff?.departmentHead,
    },
    branches: staff?.counterHead?.branches ?? [],
    address: {
      street: staff?.street ?? null,
      exteriorNumber: staff?.exteriorNumber ?? null,
      interiorNumber: staff?.interiorNumber ?? null,
      neighborhood: staff?.neighborhood ?? null,
      postalCode: staff?.postalCode ?? null,
      socialSecurityNumber: staff?.socialSecurityNumber ?? null,
    },
  };
}

function conflict(error: unknown, message: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new ConflictException(message);
  throw error;
}

@Injectable()
export class StaffAdminService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: Record<string, unknown>) {
    const q = optionalText(query.q, 'q');
    const { page, pageSize, skip, take } = pageParams(query);
    const where: Prisma.UserWhereInput = {
      role: { code: { in: STAFF_ROLES } },
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' as const } },
              { paternalLastName: { contains: q, mode: 'insensitive' as const } },
              { maternalLastName: { contains: q, mode: 'insensitive' as const } },
              { lastName: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { curp: { contains: q.toUpperCase(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.user.findMany({
        where,
        select: staffSelect,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      this.db.user.count({ where }),
    ]);
    return {
      items: rows.map(present),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async create(admin: AdminContext, data: StaffCreateDto) {
    requireNewPassword(data.password);
    const role = await this.db.role.findUnique({ where: { code: data.role } });
    if (!role || !role.active || !STAFF_ROLES.includes(role.code))
      throw fieldFailure({ role: 'Selecciona un rol administrativo válido.' });
    if (data.counterStaff && data.role !== 'COUNTER_HEAD')
      throw fieldFailure({
        counterStaff: 'El perfil técnico de ventanilla solo aplica a jefes de ventanilla.',
      });
    const municipality = resolveMunicipality(data.municipalityCode);
    const origin = await this.db.municipality.findUnique({ where: { code: municipality.code } });
    if (!origin)
      throw fieldFailure({ municipalityCode: 'El municipio no está registrado en la base.' });
    const passwordHash = await hashPassword(data.password);
    const lastName = [data.paternalLastName, data.maternalLastName].filter(Boolean).join(' ');
    try {
      const created = await this.db.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            firstName: data.firstName,
            lastName,
            paternalLastName: data.paternalLastName,
            maternalLastName: data.maternalLastName,
            curp: data.curp,
            email: data.email,
            passwordHash,
            // Cuenta administrativa aprovisionada: no requiere verificación por correo.
            emailVerifiedAt: new Date(),
            municipality: origin.name,
            municipalityCode: origin.code,
            phone: data.phone,
            phoneCountryCode: data.phone ? '52' : null,
            rfc: data.rfc,
            roleId: role.id,
            administrativeStaff: {
              create: {
                street: data.street,
                exteriorNumber: data.exteriorNumber,
                interiorNumber: data.interiorNumber,
                neighborhood: data.neighborhood,
                postalCode: data.postalCode,
                socialSecurityNumber: data.socialSecurityNumber,
                ...(data.role === 'COUNTER_HEAD'
                  ? {
                      counterHead: { create: {} },
                      ...(data.counterStaff ? { counterStaff: { create: {} } } : {}),
                    }
                  : { departmentHead: { create: {} } }),
              },
            },
          },
          select: staffSelect,
        });
        await writeAudit(transaction, {
          actorUserId: admin.userId,
          action: 'staff.create',
          resourceType: 'User',
          resourceId: user.id,
          metadata: { role: data.role, counterStaff: data.counterStaff ?? false },
        });
        return user;
      });
      return present(created);
    } catch (error) {
      return conflict(
        error,
        'Ya existe una cuenta con esa CURP, correo, RFC o número de seguridad social.',
      );
    }
  }

  async update(admin: AdminContext, id: string, data: StaffUpdateDto) {
    const target = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: { select: { code: true } },
        administrativeStaff: {
          select: { userId: true, counterStaff: { select: { userId: true } } },
        },
      },
    });
    if (!target || !STAFF_ROLES.includes(target.role.code))
      throw new NotFoundException('La cuenta de personal no existe.');
    if (data.active === false && id === admin.userId)
      throw fieldFailure({ active: 'No puedes desactivar tu propia cuenta.' });
    if (data.counterStaff !== undefined) {
      if (target.role.code !== 'COUNTER_HEAD')
        throw fieldFailure({
          counterStaff: 'El perfil técnico de ventanilla solo aplica a jefes de ventanilla.',
        });
    }
    const staffData: {
      street?: string | null;
      exteriorNumber?: string | null;
      interiorNumber?: string | null;
      neighborhood?: string | null;
      postalCode?: string | null;
      socialSecurityNumber?: string | null;
    } = {};
    if (data.street !== undefined) staffData.street = data.street;
    if (data.exteriorNumber !== undefined) staffData.exteriorNumber = data.exteriorNumber;
    if (data.interiorNumber !== undefined) staffData.interiorNumber = data.interiorNumber;
    if (data.neighborhood !== undefined) staffData.neighborhood = data.neighborhood;
    if (data.postalCode !== undefined) staffData.postalCode = data.postalCode;
    if (data.socialSecurityNumber !== undefined)
      staffData.socialSecurityNumber = data.socialSecurityNumber;
    const fields = providedFields(data);
    try {
      const updated = await this.db.$transaction(async (transaction) => {
        // Comparte el bloqueo de identidad con la creación de sesiones.
        await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${id}::uuid FOR UPDATE`;
        const profile = await transaction.counterStaff.findUnique({ where: { userId: id } });
        if (data.counterStaff === true && !profile)
          await transaction.counterStaff.create({ data: { userId: id } });
        if (data.counterStaff === false && profile) {
          const [attendances, assignments] = await Promise.all([
            transaction.attendance.count({ where: { staffId: id } }),
            transaction.staffAssignment.count({ where: { staffId: id } }),
          ]);
          if (attendances || assignments)
            throw new ConflictException(
              'No se puede retirar el perfil técnico: tiene atenciones o asignaciones registradas.',
            );
          await transaction.counterStaff.delete({ where: { userId: id } });
        }
        if (Object.keys(staffData).length)
          await transaction.administrativeStaff.upsert({
            where: { userId: id },
            create: { userId: id, ...staffData },
            update: staffData,
          });
        const user = await transaction.user.update({
          where: { id },
          data: {
            active: data.active,
            phone: data.phone === undefined ? undefined : data.phone,
            phoneCountryCode:
              data.phone === undefined ? undefined : data.phone === null ? null : '52',
          },
          select: staffSelect,
        });
        if (data.active === false) await transaction.session.deleteMany({ where: { userId: id } });
        await writeAudit(transaction, {
          actorUserId: admin.userId,
          action: 'staff.update',
          resourceType: 'User',
          resourceId: id,
          metadata: { fields: fields.join(',') },
        });
        return user;
      });
      return present(updated);
    } catch (error) {
      return conflict(error, 'Ya existe otra cuenta con ese número de seguridad social.');
    }
  }
}
