import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../core/persistence/database.service.js';
import { MailService } from '../mail/mail.service.js';
import { config } from '../../core/configuration/config.js';
import { hashPassword, verifyPassword } from '../../core/security/crypto.js';
import { setTimeout as delay } from 'node:timers/promises';
import { randomInt } from 'node:crypto';
import { ChallengePurpose, type User, Prisma } from '../../generated/prisma/client.js';
import type { RegisterDto, LoginDto, ResetCodeDto, ResetDto, VerifyDto } from './auth.dto.js';
import { requireNewPassword } from './password-policy.js';
import { resolveMunicipality } from '../catalog/municipalities.js';
import { fieldFailure } from '../../core/validation/validation.js';
import { createVerificationReceipt, readVerificationReceipt } from './verification-receipt.js';

import { ChallengeService } from '../challenges/challenge.service.js';
import { SessionService } from '../sessions/session.service.js';
import { publicUser } from './public-user.js';
import { registrationSurnames } from './surnames.js';
export { publicUser } from './public-user.js';

const recoveryMessage =
  'Si la cuenta cumple los requisitos, recibirás un código en el correo registrado. No necesitas compartirlo con nadie.';

@Injectable()
export class AuthService {
  private readonly challenges: ChallengeService;
  private readonly sessions: SessionService;

  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
  ) {
    this.challenges = new ChallengeService(db);
    this.sessions = new SessionService(db);
  }

  private issueCode(user: User, purpose: ChallengePurpose) {
    return this.challenges.issueCode(user, purpose);
  }

  private consumeCode(user: User, purpose: ChallengePurpose, code: string, newPassword?: string) {
    return this.challenges.consumeCode(user, purpose, code, newPassword);
  }

  private createSession(user: User, allowPendingVerification: boolean) {
    return this.sessions.createSession(user, allowPendingVerification);
  }

  private verificationRequired(user: User) {
    return this.sessions.verificationRequired(user);
  }

  authenticate(token: string, requireVerified = true) {
    return this.sessions.authenticate(token, requireVerified);
  }

  logout(token: string) {
    return this.sessions.logout(token);
  }

  private findUser(identifier: string) {
    return identifier.includes('@')
      ? this.db.user.findUnique({ where: { email: identifier.trim().toLowerCase() } })
      : this.db.user.findUnique({ where: { curp: identifier.trim().toUpperCase() } });
  }

  async register(data: RegisterDto) {
    requireNewPassword(data.password);
    const surnames = registrationSurnames(data);
    const municipality = resolveMunicipality(data.municipalityCode, data.municipality);
    this.mail.ensureConfigured();
    const passwordHash = await hashPassword(data.password);
    let user: User;
    try {
      user = await this.db.$transaction(async (transaction) => {
        const role = await transaction.role.findUniqueOrThrow({ where: { code: 'CITIZEN' } });
        const origin = await transaction.municipality.findUniqueOrThrow({
          where: { code: municipality.code },
        });
        // La cuenta y su perfil se crean juntas: no quedan ciudadanos sin identidad.
        return transaction.user.create({
          data: {
            firstName: data.firstName,
            ...surnames,
            curp: data.curp,
            email: data.email,
            municipality: origin.name,
            municipalityCode: origin.code,
            passwordHash,
            phone: data.phone,
            phoneCountryCode: data.phone ? '52' : null,
            rfc: data.rfc,
            roleId: role.id,
            citizen: { create: { municipalityId: origin.id } },
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'No fue posible registrar una cuenta con esos datos. Si ya iniciaste el registro, solicita reenviar la verificación.',
        );
      }
      throw error;
    }
    await this.issueCode(user, ChallengePurpose.VERIFY_EMAIL);
    const session = await this.createSession(user, true);
    return {
      message: 'Registro iniciado. Se solicitó el código para verificar tu correo.',
      email: user.email,
      ...session,
      verification: createVerificationReceipt(config.codeSecret, user.id),
    };
  }

  async requestVerification(identifier: string) {
    const started = performance.now();
    this.mail.ensureConfigured();
    const user = await this.findUser(identifier);
    if (user?.active && !user.emailVerifiedAt)
      await this.issueCode(user, ChallengePurpose.VERIFY_EMAIL);
    await delay(Math.max(0, 300 - (performance.now() - started)) + randomInt(0, 50));
    return { message: recoveryMessage };
  }

  async requestReset(identifier: string) {
    const started = performance.now();
    this.mail.ensureConfigured();
    const user = await this.findUser(identifier);
    if (user?.active && user.emailVerifiedAt)
      await this.issueCode(user, ChallengePurpose.RESET_PASSWORD);
    await delay(Math.max(0, 300 - (performance.now() - started)) + randomInt(0, 50));
    return { message: recoveryMessage };
  }

  async verifyEmail(data: VerifyDto) {
    const user = await this.findUser(data.email);
    if (!user || !(await this.consumeCode(user, ChallengePurpose.VERIFY_EMAIL, data.code))) {
      throw fieldFailure({ code: 'El código no es válido, ya fue utilizado o venció.' });
    }
    return {
      message: 'Correo verificado. Ya puedes iniciar sesión.',
      user: publicUser({ ...user, emailVerifiedAt: new Date() }),
    };
  }

  async verifyResetCode(data: ResetCodeDto) {
    const user = await this.findUser(data.identifier);
    const expiresAt = user ? await this.challenges.checkResetCode(user, data.code) : null;
    if (!expiresAt) {
      throw fieldFailure({ code: 'El código no es válido, ya fue utilizado o venció.' });
    }
    return { expiresAt: expiresAt.toISOString() };
  }

  async resetPassword(data: ResetDto) {
    requireNewPassword(data.password);
    const user = await this.findUser(data.identifier);
    if (
      !user ||
      !(await this.consumeCode(user, ChallengePurpose.RESET_PASSWORD, data.code, data.password))
    ) {
      throw fieldFailure({ code: 'El código no es válido, ya fue utilizado o venció.' });
    }
    return { message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' };
  }

  async login(data: LoginDto) {
    const user = await this.findUser(data.identifier);
    const matches = await verifyPassword(data.password, user?.passwordHash);
    if (!user || !matches || !user.active)
      throw new UnauthorizedException('Los datos de acceso no son válidos.');
    if (!user.emailVerifiedAt && data.allowPendingVerification !== true)
      throw this.verificationRequired(user);
    const session = await this.createSession(user, data.allowPendingVerification === true);
    return {
      ...session,
      ...(!session.user.emailVerified
        ? { verification: createVerificationReceipt(config.codeSecret, user.id) }
        : {}),
    };
  }

  async verificationStatus(token: string) {
    const userId = readVerificationReceipt(config.codeSecret, token);
    if (!userId)
      throw new UnauthorizedException({
        message: 'Retoma la verificación desde tu cuenta.',
        code: 'VERIFICATION_TRACKING_EXPIRED',
      });
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { active: true, emailVerifiedAt: true },
    });
    if (!user?.active)
      throw new UnauthorizedException({
        message: 'Retoma la verificación desde tu cuenta.',
        code: 'VERIFICATION_TRACKING_EXPIRED',
      });
    const now = new Date();
    const challenge = await this.db.authChallenge.findFirst({
      where: { userId, purpose: ChallengePurpose.VERIFY_EMAIL },
      orderBy: { createdAt: 'desc' },
      include: { mailJob: true },
    });
    let status = 'pending';
    if (user.emailVerifiedAt) {
      status = 'verified';
    } else if (!challenge) {
      status = 'not_requested';
    } else if (
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= config.codeAttempts
    ) {
      status = 'expired';
    } else if (challenge.mailJob?.deliveredAt) {
      status = 'accepted';
    } else if (challenge.mailJob?.abandonedAt) {
      status = 'failed';
    }
    return {
      status,
      serverTime: now.toISOString(),
      codeExpiresAt: challenge?.expiresAt.toISOString() ?? null,
      resendAvailableAt: challenge
        ? new Date(challenge.createdAt.getTime() + config.resendSeconds * 1000).toISOString()
        : now.toISOString(),
    };
  }

  async verificationContext(token: string) {
    const { user } = await this.authenticate(token, false);
    return {
      email: user.email,
      emailVerified: !!user.emailVerifiedAt,
      verification: createVerificationReceipt(config.codeSecret, user.id),
    };
  }
}
