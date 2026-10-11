import type { User } from '../../generated/prisma/client.js';

export function publicUser(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    paternalLastName: user.paternalLastName ?? null,
    maternalLastName: user.maternalLastName ?? null,
    curp: user.curp,
    email: user.email,
    municipality: user.municipality,
    municipalityCode: user.municipalityCode,
    phone: user.phone,
    rfc: user.rfc,
    emailVerified: !!user.emailVerifiedAt,
  };
}
