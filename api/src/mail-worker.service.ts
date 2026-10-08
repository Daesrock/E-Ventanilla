import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { MailService } from './mail.service.js';
import { config } from './config.js';
import { decryptCode } from './crypto.js';

@Injectable()
export class MailWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  onModuleInit() {
    if (!config.resendKey || !config.resendFrom) return;
    this.timer = setInterval(() => void this.tick(), 2000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private async tick() {
    if (this.working) return;
    this.working = true;
    try {
      const job = await this.db.$transaction(async tx => {
        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "MailJob"
          WHERE "deliveredAt" IS NULL AND "abandonedAt" IS NULL AND "availableAt" <= NOW()
            AND ("lockedUntil" IS NULL OR "lockedUntil" <= NOW())
          ORDER BY "availableAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        if (!rows[0]) return null;
        return tx.mailJob.update({ where: { id: rows[0].id }, data: {
          lockedUntil: new Date(Date.now() + 60000), attempts: { increment: 1 },
        }, include: { challenge: { include: { user: true } } } });
      });
      if (!job) return;
      const { challenge } = job;
      if (challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now() || !challenge.user.active ||
          (challenge.purpose === 'VERIFY_EMAIL' ? !!challenge.user.emailVerifiedAt : !challenge.user.emailVerifiedAt)) {
        await this.db.mailJob.update({ where: { id: job.id }, data: { abandonedAt: new Date(), ciphertext: '', lockedUntil: null } });
        return;
      }
      try {
        await this.mail.sendCode(challenge.user.email, decryptCode(config.codeSecret, job.ciphertext), challenge.purpose, challenge.id);
        await this.db.mailJob.update({ where: { id: job.id }, data: { deliveredAt: new Date(), ciphertext: '', lockedUntil: null } });
      } catch {
        const abandoned = job.attempts >= 3;
        await this.db.mailJob.update({ where: { id: job.id }, data: {
          lockedUntil: null, availableAt: new Date(Date.now() + 30000 * job.attempts),
          ...(abandoned ? { abandonedAt: new Date(), ciphertext: '' } : {}),
        } });
        Logger.warn('No se pudo entregar un correo de acceso. Se aplicó la política de reintentos.', 'Correo');
      }
    } catch { Logger.error('No se pudo procesar la cola de correo.', 'Correo'); }
    finally { this.working = false; }
  }
}
