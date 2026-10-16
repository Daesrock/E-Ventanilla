/** Contratos internos del panel administrativo. La autorización vive en `admin.auth.ts`. */
export interface AdminIdentity {
  id: string;
  firstName: string;
  lastName: string;
  paternalLastName: string | null;
  maternalLastName: string | null;
  email: string;
  emailVerifiedAt: Date | null;
  active: boolean;
}

export interface AdminContext {
  userId: string;
  user: AdminIdentity;
  role: { code: string; name: string; hierarchyLevel: number | null };
  permissions: Set<string>;
  /** Root y jefe de departamento operan sobre toda la dependencia. */
  allBranches: boolean;
  /** Sedes asignadas cuando la cuenta no tiene alcance total. */
  branchIds: string[];
  /** Perfiles técnicos presentes en AdministrativeStaff. */
  staffProfiles: { counterStaff: boolean; counterHead: boolean; departmentHead: boolean };
}

/** Subconjunto de Prisma suficiente para escribir la auditoría; permite dobles de prueba. */
export interface AuditTarget {
  administrativeAuditLog: {
    create: (args: {
      data: {
        actorUserId: string;
        action: string;
        resourceType: string;
        resourceId?: string | null;
        branchId?: string | null;
        outcome?: string;
        metadata?: unknown;
      };
    }) => Promise<unknown>;
  };
}
