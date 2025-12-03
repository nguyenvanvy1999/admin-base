import { db, type IDb } from 'src/config/db';
import type { EmailService } from 'src/service/mail/email.service';
import { emailService } from 'src/service/mail/email.service';
import type { AuditLogService } from 'src/service/misc/audit-log.service';
import { auditLogService } from 'src/service/misc/audit-log.service';
import type { IdempotencyService } from 'src/service/misc/idempotency.service';
import { idempotencyService } from 'src/service/misc/idempotency.service';
import type { LockingService } from 'src/service/misc/locking.service';
import { lockingService } from 'src/service/misc/locking.service';
import { EmailType, type SendMailMap } from 'src/share';

export class WorkerService {
  constructor(
    private readonly deps: {
      db: IDb;
      emailService: EmailService;
      auditLogService: AuditLogService;
      lockingService: LockingService;
      idempotencyService: IdempotencyService;
    } = {
      db,
      emailService,
      auditLogService,
      lockingService,
      idempotencyService,
    },
  ) {}

  async handleEmailJob(jobName: string, data: SendMailMap): Promise<void> {
    switch (jobName) {
      case EmailType.OTP: {
        const params = data[EmailType.OTP];
        await this.deps.emailService.sendEmailOtp(
          params.email,
          params.otp,
          params.purpose,
        );
        break;
      }
      default:
        break;
    }
  }
}

export const workerService = new WorkerService();
