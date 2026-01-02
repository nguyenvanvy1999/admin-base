import type { IDb } from 'src/config/db';
import type { ChangePasswordParams } from 'src/dtos/auth.dto';
import { BadReqErr, ctxStore, ErrCode } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IPasswordService } from '../../domain/interfaces/password.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import type { ISettingsService } from '../../domain/interfaces/settings.service.interface';
import { buildPasswordChangedAuditLog } from '../../utils/auth-audit.helper';
import {
  assertUserActiveOrBadReq,
  assertUserExists,
} from '../../utils/auth-errors.util';

export class ChangePasswordUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      passwordService: IPasswordService;
      sessionService: ISessionService;
      settingService: ISettingsService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: ChangePasswordParams): Promise<void> {
    const { userId, oldPassword, newPassword } = params;

    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, status: true, email: true },
    });
    assertUserExists(user);
    assertUserActiveOrBadReq(user);

    if (user.password) {
      if (!oldPassword) {
        throw new BadReqErr(ErrCode.PasswordNotMatch);
      }
      const match = await this.deps.passwordService.comparePassword(
        oldPassword,
        user.password,
      );
      if (!match) {
        throw new BadReqErr(ErrCode.PasswordNotMatch);
      }
    }

    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        ...(await this.deps.passwordService.createPassword(newPassword)),
        lastPasswordChangeAt: new Date(),
      },
      select: { id: true },
    });

    if (await this.deps.settingService.revokeSessionsOnPasswordChange()) {
      await this.deps.sessionService.revoke(userId);
    }

    const { sessionId } = ctxStore.getStore() ?? {};
    await this.deps.auditLogService.pushSecurity(
      buildPasswordChangedAuditLog(user, 'user', {
        userId,
        sessionId,
      }),
      { userId, sessionId: sessionId ?? null, subjectUserId: userId },
    );
  }
}
