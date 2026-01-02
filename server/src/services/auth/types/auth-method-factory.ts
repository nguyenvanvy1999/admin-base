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
import { AuthMethodType } from './constants';

export class AuthMethodFactory {
  private handlers: Map<AuthMethodType, IAuthMethodHandler>;

  constructor() {
    const handlerMap = new Map<AuthMethodType, IAuthMethodHandler>();

    handlerMap.set(
      AuthMethodType.TOTP,
      new TotpHandler({
        authenticator,
        authUserService,
      }),
    );

    handlerMap.set(
      AuthMethodType.BACKUP_CODE,
      new BackupCodeHandler({
        mfaService,
      }),
    );

    handlerMap.set(
      AuthMethodType.EMAIL_OTP,
      new EmailOtpHandler({
        mfaService,
        otpService,
      }),
    );

    handlerMap.set(
      AuthMethodType.DEVICE_VERIFY,
      new DeviceVerifyHandler({
        otpService,
      }),
    );

    this.handlers = handlerMap;
  }

  create(type: AuthMethodType): IAuthMethodHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new BadReqErr(ErrCode.ValidationError, {
        errors: `Unsupported auth method type: ${type}`,
      });
    }
    return handler;
  }
}

export const authMethodFactory = new AuthMethodFactory();
