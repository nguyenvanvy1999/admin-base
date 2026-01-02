import type { IDb } from 'src/config/db';
import type { RegisterParams } from 'src/dtos/auth.dto';
import { AuditLogVisibility } from 'src/generated';
import { BadReqErr, ErrCode, normalizeEmail, PurposeVerify } from 'src/share';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { IOtpService } from '../../domain/interfaces/otp.service.interface';
import type { IUserUtilService } from '../../domain/interfaces/user-util.service.interface';
import { AuthMethod } from '../../types/constants';
import {
  buildRegisterFailedAuditLog,
  buildRegisterStartedAuditLog,
} from '../../utils/auth-audit.helper';

export class RegisterUseCase {
  constructor(
    private readonly deps: {
      db: IDb;
      userUtilService: IUserUtilService;
      otpService: IOtpService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: RegisterParams): Promise<{ otpToken: string } | null> {
    const { email, password } = params;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (existingUser) {
      await this.deps.auditLogService.pushSecurity(
        buildRegisterFailedAuditLog(
          normalizedEmail,
          AuthMethod.EMAIL,
          'user_exists',
        ),
        { visibility: AuditLogVisibility.admin_only },
      );
      throw new BadReqErr(ErrCode.UserExisted);
    }

    const createdUserId = await this.deps.userUtilService.createUser(
      normalizedEmail,
      password,
    );

    const otpToken = await this.deps.otpService.sendOtp(
      createdUserId,
      normalizedEmail,
      PurposeVerify.REGISTER,
    );

    await this.deps.auditLogService.pushSecurity(
      buildRegisterStartedAuditLog(
        { id: createdUserId, email: normalizedEmail },
        AuthMethod.EMAIL,
        { userId: createdUserId },
      ),
      { userId: createdUserId, subjectUserId: createdUserId },
    );

    if (otpToken) {
      return { otpToken };
    }
    return null;
  }
}
