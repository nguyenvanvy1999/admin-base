import type { IDb } from 'src/config/db';
import type { ForgotPasswordParams } from 'src/dtos/auth.dto';
import { AuditLogVisibility } from 'src/generated';
import { BadReqErr, ErrCode, PurposeVerify } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IOtpService } from '../../domain/interfaces/otp.service.interface';
import type { IPasswordService } from '../../domain/interfaces/password.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import {
  buildPasswordResetCompletedAuditLog,
  buildPasswordResetFailedAuditLog,
} from '../../utils/auth-audit.helper';
import { assertUserExists } from '../../utils/auth-errors.util';

export class ForgotPasswordUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      otpService: IOtpService;
      passwordService: IPasswordService;
      sessionService: ISessionService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: ForgotPasswordParams): Promise<void> {
    const { otpToken, otp, newPassword } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.FORGOT_PASSWORD,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.pushSecurity(
        buildPasswordResetFailedAuditLog(undefined, 'invalid_otp'),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    assertUserExists(user);

    await this.deps.db.user.update({
      where: { id: user.id },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    await this.deps.sessionService.revoke(userId);

    await this.deps.auditLogService.pushSecurity(
      buildPasswordResetCompletedAuditLog(
        { id: user.id, email: null },
        { userId: user.id },
      ),
      { userId: user.id, subjectUserId: user.id },
    );
  }
}
