import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/persistence/database.module.js';
import { MailService } from './mail.service.js';
import { MailWorker } from './mail-worker.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [MailService, MailWorker],
  exports: [MailService],
})
export class MailModule {}
