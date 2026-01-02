import { db, type IDb } from 'src/config/db';
import { emailQueue, type IEmailQueue } from 'src/config/queue';
import { AuditLogVisibility, UserStatus } from 'src/generated';
import type { LockingService } from 'src/services/misc';
import { lockingService } from 'src/services/misc';
import {
  ctxStore,
  EmailType,
  type IdUtil,
  idUtil,
  PurposeVerify,
} from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IOtpService } from '../../domain/interfaces/otp.service.interface';
import type { ISettingsService } from '../../domain/interfaces/settings.service.interface';
import {
  buildOtpSendFailedAuditLog,
  buildOtpSentAuditLog,
} from '../../utils/auth-audit.helper';
import {
  type IOtpRepository,
  otpRepository,
} from '../repositories/otp.repository';

export class OtpProvider implements IOtpService {
  constructor(
    private readonly deps: {
      otpRepository: IOtpRepository;
      emailQueue: IEmailQueue;
      auditLogService: IAuditLogService;
      settingService: ISettingsService;
      idUtil: IdUtil;
      db: IDb;
      lockingService: LockingService;
    } = {
      otpRepository,
      emailQueue,
      auditLogService: null as any,
      settingService: null as any,
      idUtil,
      db,
      lockingService,
    },
  ) {}

  async generateOtp(
    id: string,
    purpose: PurposeVerify,
    userId: string,
  ): Promise<string> {
    return await this.deps.otpRepository.generateOtp(id, purpose, userId);
  }

  async verifyOtp(
    id: string,
    purpose: PurposeVerify,
    otp: string,
  ): Promise<string | null> {
    const result = await this.deps.otpRepository.verifyOtp(id, purpose, otp);
    return result?.userId ?? null;
  }

  sendOtp(
    userId: string,
    email: string,
    purpose: PurposeVerify,
  ): Promise<string | null> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    const key = `${email}_${purpose}`;
    return this.deps.lockingService.lock(key, async () => {
      email = email.toLowerCase();
      const isRateLimited = await this.deps.otpRepository.checkRateLimit(key);
      if (isRateLimited) {
        return null;
      }

      const otpToken = this.deps.idUtil.token16();
      const otp = await this.generateOtp(otpToken, purpose, userId);
      await this.deps.emailQueue.add(EmailType.OTP, {
        [EmailType.OTP]: { email, otp, purpose },
      });
      await this.deps.otpRepository.setRateLimit(key);
      return otpToken;
    });
  }

  async sendOtpWithAudit(
    email: string,
    purpose: PurposeVerify,
  ): Promise<{ otpToken: string } | null> {
    email = email.toLowerCase();

    const user = await this.deps.db.user.findUnique({
      where: { email },
      select: { id: true, status: true, password: true, mfaTotpEnabled: true },
    });

    if (!user) {
      const { userId, sessionId } = ctxStore.getStore() ?? {};
      await this.deps.auditLogService.pushSecurity(
        buildOtpSendFailedAuditLog(email, purpose, 'user_not_found', {
          userId,
          sessionId,
        }),
        {
          visibility: AuditLogVisibility.admin_only,
          userId: userId ?? undefined,
          sessionId: sessionId ?? null,
        },
      );
      return null;
    }

    const allowed = await this.checkOtpConditions(user, purpose);
    if (!allowed) {
      const { sessionId } = ctxStore.getStore() ?? {};
      await this.deps.auditLogService.pushSecurity(
        buildOtpSendFailedAuditLog(email, purpose, 'otp_conditions_not_met', {
          userId: user.id,
          sessionId,
        }),
        {
          subjectUserId: user.id,
          userId: user.id,
          sessionId: sessionId ?? null,
        },
      );
      return null;
    }

    const otpToken = await this.sendOtp(user.id, email, purpose);
    if (!otpToken) {
      const { sessionId } = ctxStore.getStore() ?? {};
      await this.deps.auditLogService.pushSecurity(
        buildOtpSendFailedAuditLog(email, purpose, 'otp_send_failed', {
          userId: user.id,
          sessionId,
        }),
        {
          subjectUserId: user.id,
          userId: user.id,
          sessionId: sessionId ?? null,
        },
      );
      return null;
    }

    const { sessionId } = ctxStore.getStore() ?? {};
    await this.deps.auditLogService.pushSecurity(
      buildOtpSentAuditLog(email, purpose, {
        userId: user.id,
        sessionId,
      }),
      {
        subjectUserId: user.id,
        userId: user.id,
        sessionId: sessionId ?? null,
      },
    );

    if (purpose === PurposeVerify.REGISTER) {
      await this.deps.otpRepository.incrementRegisterOtpLimit(user.id);
    }

    return { otpToken };
  }

  async checkOtpConditions(
    user: {
      id: string;
      status: UserStatus;
      password: string | null;
      mfaTotpEnabled: boolean;
    },
    purpose: PurposeVerify,
  ): Promise<boolean> {
    switch (purpose) {
      case PurposeVerify.REGISTER: {
        const limit = await this.deps.otpRepository.getRegisterOtpLimit(
          user.id,
        );
        const otpLimit = await this.deps.settingService.registerOtpLimit();
        if (limit && limit >= otpLimit) {
          await this.deps.db.user.update({
            where: { id: user.id },
            data: { status: UserStatus.suspendded },
            select: { id: true },
          });
          return false;
        }

        return user.status === UserStatus.inactive;
      }

      case PurposeVerify.FORGOT_PASSWORD: {
        return Boolean(user.password);
      }

      case PurposeVerify.RESET_MFA: {
        return user.mfaTotpEnabled;
      }

      case PurposeVerify.MFA_LOGIN:
      case PurposeVerify.DEVICE_VERIFY: {
        return user.status === UserStatus.active;
      }

      default:
        return false;
    }
  }
}
