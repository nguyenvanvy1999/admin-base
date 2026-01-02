import { authenticator } from 'otplib';
import { authUserService } from 'src/services/auth/core/auth-user.service';
import { BackupCodeHandler } from 'src/services/auth/methods/handlers/backup-code-handler';
import { DeviceVerifyHandler } from 'src/services/auth/methods/handlers/device-verify-handler';
import { EmailOtpHandler } from 'src/services/auth/methods/handlers/email-otp-handler';
import { TotpHandler } from 'src/services/auth/methods/handlers/totp-handler';
import { mfaService } from 'src/services/auth/methods/mfa.service';
import { otpService } from 'src/services/auth/methods/otp.service';
import { BadReqErr, ErrCode } from 'src/share';
import type { IAuthMethodHandler } from './auth-method-handler.interface';
import { AuthChallengeType } from './constants';

export class AuthMethodFactory {
  private handlers: Map<AuthChallengeType, IAuthMethodHandler>;

  constructor() {
    const handlerMap = new Map<AuthChallengeType, IAuthMethodHandler>();

    handlerMap.set(
      AuthChallengeType.MFA_TOTP,
      new TotpHandler({
        authenticator,
        authUserService,
      }),
    );

    handlerMap.set(
      AuthChallengeType.MFA_BACKUP_CODE,
      new BackupCodeHandler({
        mfaService,
      }),
    );

    handlerMap.set(
      AuthChallengeType.MFA_EMAIL_OTP,
      new EmailOtpHandler({
        mfaService,
        otpService,
      }),
    );

    handlerMap.set(
      AuthChallengeType.DEVICE_VERIFY,
      new DeviceVerifyHandler({
        otpService,
      }),
    );

    this.handlers = handlerMap;
  }

  create(type: AuthChallengeType): IAuthMethodHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: `Unsupported auth challenge type: ${type}`,
      });
    }
    return handler;
  }
}

export const authMethodFactory = new AuthMethodFactory();
