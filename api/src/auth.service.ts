import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { MailService } from './mail.service.js';
import { config } from './config.js';
import { codeDigest, createCode, createToken, encryptCode, equalDigest, hashPassword, tokenDigest, verifyPassword } from './crypto.js';
import { setTimeout as delay } from 'node:timers/promises';
import { randomInt } from 'node:crypto';
import { ChallengePurpose, type User, Prisma } from './generated/prisma/client.js';
import type { RegisterDto, LoginDto, ResetDto, VerifyDto } from './auth.dto.js';
import { requireNewPassword } from './password-policy.js';
import { resolveMunicipality } from './municipalities.js';
import { fieldFailure } from './validation.js';

const recoveryMessage = 'Si la cuenta cumple los requisitos, recibirás un código en el correo registrado. No necesitas compartirlo con nadie.';

export function publicUser(user: User) {
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName,
    curp: user.curp, email: user.email, municipality: user.municipality, municipalityCode: user.municipalityCode,
    phone: user.phone, rfc: user.rfc, emailVerified: !!user.emailVerifiedAt,
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  private findUser(identifier: string) {
    return identifier.includes('@')
      ? this.db.user.findUnique({ where: { email: identifier.trim().toLowerCase() } })
      : this.db.user.findUnique({ where: { curp: identifier.trim().toUpperCase() } });
  }

  async register(data: RegisterDto) {
    requireNewPassword(data.password);
    const municipality = resolveMunicipality(data.municipalityCode, data.municipality);
    this.mail.ensureConfigured();
    const passwordHash = await hashPassword(data.password);
    let user: User;
    try {
      user = await this.db.user.create({ data: {
        firstName: data.firstName, lastName: data.lastName, curp: data.curp,
        email: data.email, municipality: municipality.name, municipalityCode: municipality.code, passwordHash,
        phone: data.phone, rfc: data.rfc,
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('No fue posible registrar una cuenta con esos datos. Si ya iniciaste el registro, solicita reenviar la verificación.');
      }
      throw error;
    }
    await this.issueCode(user, ChallengePurpose.VERIFY_EMAIL);
    return { message: 'Registro iniciado. Se solicitó el código para verificar tu correo.', email: user.email };
  }

  private async issueCode(user: User, purpose: ChallengePurpose) {
    const code = createCode();
    await this.db.$transaction(async tx => {
      // Serializa emisiones de códigos de una misma cuenta, incluidos reintentos concurrentes.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!current.active || (purpose === ChallengePurpose.VERIFY_EMAIL ? !!current.emailVerifiedAt : !current.emailVerifiedAt)) return null;
      const previous = await tx.authChallenge.findFirst({ where: { userId: user.id, purpose }, orderBy: { createdAt: 'desc' } });
      if (previous && previous.createdAt.getTime() + config.resendSeconds * 1000 > Date.now()) return null;
      await tx.authChallenge.updateMany({ where: { userId: user.id, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
      const challenge = await tx.authChallenge.create({ data: {
        userId: user.id, purpose,
        digest: codeDigest(config.codeSecret, user.id, purpose, code),
        expiresAt: new Date(Date.now() + config.codeTtl * 1000),
      } });
      await tx.mailJob.create({ data: { challengeId: challenge.id, ciphertext: encryptCode(config.codeSecret, code) } });
    });
  }

  async requestVerification(identifier: string) {
    const started = performance.now();
    this.mail.ensureConfigured();
    const user = await this.findUser(identifier);
    if (user?.active && !user.emailVerifiedAt) await this.issueCode(user, ChallengePurpose.VERIFY_EMAIL);
    await delay(Math.max(0, 300 - (performance.now() - started)) + randomInt(0, 50));
    return { message: recoveryMessage };
  }

  async requestReset(identifier: string) {
    const started = performance.now();
    this.mail.ensureConfigured();
    const user = await this.findUser(identifier);
    if (user?.active && user.emailVerifiedAt) await this.issueCode(user, ChallengePurpose.RESET_PASSWORD);
    await delay(Math.max(0, 300 - (performance.now() - started)) + randomInt(0, 50));
    return { message: recoveryMessage };
  }

  private async consumeCode(user: User, purpose: ChallengePurpose, code: string, passwordHash?: string) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!current.active || (purpose === ChallengePurpose.VERIFY_EMAIL ? !!current.emailVerifiedAt : !current.emailVerifiedAt)) return false;
      const challenge = await tx.authChallenge.findFirst({ where: { userId: user.id, purpose, consumedAt: null }, orderBy: { createdAt: 'desc' } });
      if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= config.codeAttempts) return false;
      if (!equalDigest(challenge.digest, codeDigest(config.codeSecret, user.id, purpose, code))) {
        // No lanzar dentro de esta transacción: se perdería el incremento de intentos.
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
        return false;
      }
      await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      if (purpose === ChallengePurpose.VERIFY_EMAIL) {
        await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      } else {
        if (!passwordHash) return false;
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.authChallenge.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date() } });
      }
      return true;
    });
  }

  async verifyEmail(data: VerifyDto) {
    const user = await this.findUser(data.email);
    if (!user || !await this.consumeCode(user, ChallengePurpose.VERIFY_EMAIL, data.code)) {
      throw fieldFailure({ code: 'El código no es válido, ya fue utilizado o venció.' });
    }
    return { message: 'Correo verificado. Ya puedes iniciar sesión.' };
  }

  async resetPassword(data: ResetDto) {
    requireNewPassword(data.password);
    const passwordHash = await hashPassword(data.password);
    const user = await this.findUser(data.identifier);
    if (!user || !await this.consumeCode(user, ChallengePurpose.RESET_PASSWORD, data.code, passwordHash)) {
      throw fieldFailure({ code: 'El código no es válido, ya fue utilizado o venció.' });
    }
    return { message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' };
  }

  async login(data: LoginDto) {
    const user = await this.findUser(data.identifier);
    const matches = await verifyPassword(data.password, user?.passwordHash);
    if (!user || !matches || !user.active) throw new UnauthorizedException('Los datos de acceso no son válidos.');
    if (!user.emailVerifiedAt) throw new ForbiddenException({
      message: 'Verifica tu correo para acceder a tu cuenta.', code: 'EMAIL_VERIFICATION_REQUIRED', email: user.email,
    });
    const token = createToken();
    const expiresAt = new Date(Date.now() + config.sessionTtl * 1000);
    const saved = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      // Una recuperación concurrente debe impedir crear una sesión con la contraseña anterior.
      if (!current.active || !current.emailVerifiedAt || current.passwordHash !== user.passwordHash) return null;
      await tx.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
      await tx.session.create({ data: { userId: user.id, digest: tokenDigest(token), expiresAt } });
      return current;
    });
    if (!saved) throw new UnauthorizedException('Los datos de acceso cambiaron. Intenta nuevamente.');
    return { token, expiresAt: expiresAt.toISOString(), user: publicUser(saved) };
  }

  async authenticate(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException('Inicia sesión para continuar.');
    const session = await this.db.session.findUnique({ where: { digest: tokenDigest(token) }, include: { user: true } });
    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.active || !session.user.emailVerifiedAt) {
      throw new UnauthorizedException('La sesión no está disponible. Inicia sesión nuevamente.');
    }
    return session;
  }

  async logout(token: string) {
    await this.db.session.deleteMany({ where: { digest: tokenDigest(token) } });
    return { message: 'Sesión cerrada.' };
  }
}
