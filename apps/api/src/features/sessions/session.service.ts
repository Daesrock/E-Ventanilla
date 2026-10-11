import { DatabaseService } from '../../core/persistence/database.service.js';
import { config } from '../../core/configuration/config.js';
import { ChallengePurpose, type User } from '../../generated/prisma/client.js';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createToken, tokenDigest } from '../../core/security/crypto.js';
import { publicUser } from '../auth/public-user.js';
import { createVerificationReceipt } from '../auth/verification-receipt.js';

export class SessionService {
  constructor(private readonly db: DatabaseService) {}

  async createSession(user: User, allowPendingVerification: boolean) {
    const token = createToken();
    const expiresAt = new Date(Date.now() + config.sessionTtl * 1000);
    const saved = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      // Una recuperación concurrente debe impedir crear una sesión con la contraseña anterior.
      if (
        !current.active ||
        (!current.emailVerifiedAt && !allowPendingVerification) ||
        current.passwordHash !== user.passwordHash
      )
        return null;
      await tx.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
      await tx.session.create({ data: { userId: user.id, digest: tokenDigest(token), expiresAt } });
      return current;
    });
    if (!saved)
      throw new UnauthorizedException('Los datos de acceso cambiaron. Intenta nuevamente.');
    return { token, expiresAt: expiresAt.toISOString(), user: publicUser(saved) };
  }

  async authenticate(token: string, requireVerified = true) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException('Inicia sesión para continuar.');
    const session = await this.db.session.findUnique({
      where: { digest: tokenDigest(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.active) {
      throw new UnauthorizedException('La sesión no está disponible. Inicia sesión nuevamente.');
    }
    if (requireVerified && !session.user.emailVerifiedAt)
      throw this.verificationRequired(session.user);
    return session;
  }

  verificationRequired(user: User) {
    return new ForbiddenException({
      message: 'Verifica tu correo para continuar con una cita.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      email: user.email,
      verification: createVerificationReceipt(config.codeSecret, user.id),
    });
  }

  async logout(token: string) {
    await this.db.session.deleteMany({ where: { digest: tokenDigest(token) } });
    return { message: 'Sesión cerrada.' };
  }
}
