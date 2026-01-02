import type { IDb } from 'src/config/db';
import type { VerifyAccountParams } from 'src/dtos/auth.dto';
import { AuditLogVisibility, UserStatus } from 'src/generated';
import { buildUpdateChanges } from 'src/services/audit-logs/audit-logs.utils';
import { BadReqErr, ErrCode, PurposeVerify } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IOtpService } from '../../domain/interfaces/otp.service.interface';
import { buildOtpInvalidAuditLog } from '../../utils/auth-audit.helper';

export class VerifyAccountUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      otpService: IOtpService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: VerifyAccountParams): Promise<void> {
    const { otpToken, otp } = params;

    const userId = await this.deps.otpService.verifyOtp(
      otpToken,
      PurposeVerify.REGISTER,
      otp,
    );

    if (!userId) {
      await this.deps.auditLogService.pushSecurity(
        buildOtpInvalidAuditLog(
          undefined,
          PurposeVerify.REGISTER,
          'invalid_otp',
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.InvalidOtp);
    }

    await this.deps.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId, status: UserStatus.inactive },
        data: { status: UserStatus.active },
        select: { id: true },
      });
    });

    const changes = buildUpdateChanges(
      { status: UserStatus.inactive },
      { status: UserStatus.active },
    );
    await this.deps.auditLogService.pushCud(
      {
        category: 'cud',
        entityType: 'user',
        entityId: userId,
        action: 'update',
        changes,
      },
      {
        subjectUserId: userId,
        visibility: AuditLogVisibility.actor_and_subject,
      },
    );
  }
}
