import { authenticator } from 'otplib';
import { BadReqErr, ErrCode } from 'src/share';
import type { IAuthMethodHandler } from './auth-method-handler.interface';
import { authUserService } from './auth-user.service';
import { AuthChallengeType } from './constants';
import { BackupCodeHandler } from './handlers/backup-code-handler';
import { DeviceVerifyHandler } from './handlers/device-verify-handler';
import { EmailOtpHandler } from './handlers/email-otp-handler';
import { TotpHandler } from './handlers/totp-handler';
import { mfaService } from './mfa.service';
import { otpService } from './otp.service';

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

  getSupportedTypes(): AuthChallengeType[] {
    return Array.from(this.handlers.keys());
  }
}

export const authMethodFactory = new AuthMethodFactory();
