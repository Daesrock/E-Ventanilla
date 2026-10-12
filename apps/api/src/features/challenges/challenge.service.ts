import { DatabaseService } from '../../core/persistence/database.service.js';
import { config } from '../../core/configuration/config.js';
import { ChallengePurpose, type User, Prisma } from '../../generated/prisma/client.js';
import {
  createCode,
  codeDigest,
  encryptCode,
  equalDigest,
  hashPassword,
  verifyPassword,
} from '../../core/security/crypto.js';
import { fieldFailure } from '../../core/validation/validation.js';

export class ChallengeService {
  constructor(private readonly db: DatabaseService) {}

  async issueCode(user: User, purpose: ChallengePurpose) {
    const code = createCode();
    await this.db.$transaction(async (tx) => {
      // Serializa emisiones de códigos de una misma cuenta, incluidos reintentos concurrentes.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (
        !current.active ||
        (purpose === ChallengePurpose.VERIFY_EMAIL
          ? !!current.emailVerifiedAt
          : !current.emailVerifiedAt)
      )
        return null;
      const previous = await tx.authChallenge.findFirst({
        where: { userId: user.id, purpose },
        orderBy: { createdAt: 'desc' },
      });
      if (previous && previous.createdAt.getTime() + config.resendSeconds * 1000 > Date.now())
        return null;
      await tx.authChallenge.updateMany({
        where: { userId: user.id, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      const challenge = await tx.authChallenge.create({
        data: {
          userId: user.id,
          purpose,
          digest: codeDigest(config.codeSecret, user.id, purpose, code),
          expiresAt: new Date(Date.now() + config.codeTtl * 1000),
        },
      });
      await tx.mailJob.create({
        data: { challengeId: challenge.id, ciphertext: encryptCode(config.codeSecret, code) },
      });
    });
  }

  private async validCode(
    tx: Prisma.TransactionClient,
    user: User,
    purpose: ChallengePurpose,
    code: string,
  ) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (
      !current.active ||
      (purpose === ChallengePurpose.VERIFY_EMAIL
        ? !!current.emailVerifiedAt
        : !current.emailVerifiedAt)
    )
      return null;
    const challenge = await tx.authChallenge.findFirst({
      where: { userId: user.id, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !challenge ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.attempts >= config.codeAttempts
    )
      return null;
    if (!equalDigest(challenge.digest, codeDigest(config.codeSecret, user.id, purpose, code))) {
      // No lanzar dentro de esta transacción: se perdería el incremento de intentos.
      await tx.authChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return null;
    }
    return challenge;
  }

  async checkResetCode(user: User, code: string) {
    return this.db.$transaction(async (tx) => {
      const challenge = await this.validCode(tx, user, ChallengePurpose.RESET_PASSWORD, code);
      // Solo comprueba el código. Se consume al guardar la contraseña, en la misma
      // transacción que actualiza el hash y revoca sesiones. No crea una sesión.
      return challenge?.expiresAt ?? null;
    });
  }

  async consumeCode(user: User, purpose: ChallengePurpose, code: string, newPassword?: string) {
    if (purpose === ChallengePurpose.RESET_PASSWORD && !newPassword) return false;
    return this.db.$transaction(async (tx) => {
      const challenge = await this.validCode(tx, user, purpose, code);
      if (!challenge) return false;
      let passwordHash: string | undefined;
      if (purpose === ChallengePurpose.RESET_PASSWORD) {
        if (!newPassword) return false;
        // La cuenta sigue bloqueada: compara la credencial vigente antes de consumir el código.
        const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        if (await verifyPassword(newPassword, current.passwordHash)) {
          throw fieldFailure({ password: 'La nueva contraseña debe ser diferente de la actual.' });
        }
        passwordHash = await hashPassword(newPassword);
      }
      await tx.authChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      if (purpose === ChallengePurpose.VERIFY_EMAIL) {
        await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      } else {
        if (!passwordHash) return false;
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.authChallenge.updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: new Date() },
        });
      }
      return true;
    });
  }
}
