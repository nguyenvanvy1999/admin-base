import type { authenticator } from 'otplib';
import type { IDb } from 'src/config/db';
import type {
  DisableMfaRequestParams,
  RegenerateBackupCodesResponse,
} from 'src/dtos/auth.dto';
import { AuditLogVisibility } from 'src/generated';
import { BadReqErr, ErrCode, userResSelect } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IMfaService } from '../../domain/interfaces/mfa.service.interface';
import type { IPasswordService } from '../../domain/interfaces/password.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import { AuthMethod } from '../../types/constants';
import {
  buildLoginFailedAuditLog,
  buildMfaBackupCodesRegeneratedAuditLog,
  buildMfaDisabledAuditLog,
  buildMfaFailedAuditLog,
} from '../../utils/auth-audit.helper';
import { assertUserExists } from '../../utils/auth-errors.util';

export class RegenerateBackupCodesUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      mfaService: IMfaService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(userId: string): Promise<RegenerateBackupCodesResponse> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaTotpEnabled: true },
    });

    assertUserExists(user);
    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const code = this.deps.mfaService.generateBackupCode();
    const hashedCode = await this.deps.mfaService.hashBackupCode(code);

    await this.deps.mfaService.saveBackupCode(userId, hashedCode);

    await this.deps.auditLogService.pushSecurity(
      buildMfaBackupCodesRegeneratedAuditLog(user, {
        userId: user.id,
      }),
      {
        userId: user.id,
        subjectUserId: user.id,
        visibility: AuditLogVisibility.actor_only,
      },
    );

    return { backupCodes: [code] };
  }
}

export class DisableMfaUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      passwordService: IPasswordService;
      sessionService: ISessionService;
      auditLogService: IAuditLogService;
      authenticator: typeof authenticator;
    },
  ) {}

  async execute(
    params: { userId: string } & DisableMfaRequestParams,
  ): Promise<void> {
    const { userId, password, code } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        ...userResSelect,
        password: true,
        passwordAttempt: true,
        passwordExpired: true,
      },
    });

    assertUserExists(user);

    if (!user.mfaTotpEnabled) throw new BadReqErr(ErrCode.ActionNotAllowed);

    const passwordValid = await this.deps.passwordService.verifyAndTrack(
      password,
      user,
    );

    if (!passwordValid) {
      await this.deps.auditLogService.pushSecurity(
        buildLoginFailedAuditLog(
          user,
          AuthMethod.EMAIL,
          'password_verification_failed_during_disable_mfa',
          { userId: user.id },
        ),
        { userId: user.id, subjectUserId: user.id },
      );
      throw new BadReqErr(ErrCode.PasswordNotMatch);
    }

    if (!user.totpSecret) throw new BadReqErr(ErrCode.MfaBroken);

    try {
      const otpOk = this.deps.authenticator.verify({
        secret: user.totpSecret,
        token: code,
      });
      if (!otpOk) throw new Error('Invalid OTP');
    } catch {
      await this.deps.auditLogService.pushSecurity(
        buildMfaFailedAuditLog(
          user,
          AuthMethod.TOTP,
          'invalid_otp_during_disable_mfa',
          { userId: user.id },
        ),
        { userId: user.id, subjectUserId: user.id },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        mfaTotpEnabled: false,
        totpSecret: null,
      },
      select: { id: true },
    });

    await Promise.allSettled([
      this.deps.sessionService.revoke(userId),
      this.deps.auditLogService.pushSecurity(
        buildMfaDisabledAuditLog(user, AuthMethod.TOTP, 'user', {
          userId: user.id,
        }),
        {
          userId: user.id,
          subjectUserId: user.id,
          visibility: AuditLogVisibility.actor_and_subject,
        },
      ),
    ]);
  }
}
