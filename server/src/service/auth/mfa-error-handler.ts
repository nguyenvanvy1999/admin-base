import { BadReqErr, ErrCode, NotFoundErr, UnAuthErr } from 'src/share';

export class MfaErrorHandler {
  static handleMfaNotEnabled(): never {
    throw new BadReqErr(ErrCode.MFANotEnabled);
  }

  static handleMfaAlreadySetup(): never {
    throw new BadReqErr(ErrCode.MFAHasBeenSetup);
  }

  static handleInvalidOtp(): never {
    throw new BadReqErr(ErrCode.InvalidOtp);
  }

  static handleInvalidBackupCode(): never {
    throw new BadReqErr(ErrCode.InvalidBackupCode);
  }

  static handleBackupCodeAlreadyUsed(): never {
    throw new BadReqErr(ErrCode.BackupCodeAlreadyUsed);
  }

  static handleNoBackupCodesAvailable(): never {
    throw new BadReqErr(ErrCode.NoBackupCodesAvailable);
  }

  static handleUserNotFound(): never {
    throw new NotFoundErr(ErrCode.UserNotFound);
  }

  static handleSessionExpired(): never {
    throw new BadReqErr(ErrCode.SessionExpired);
  }

  static handleMfaBroken(): never {
    throw new BadReqErr(ErrCode.MfaBroken);
  }

  static handleUnauthorized(): never {
    throw new UnAuthErr(ErrCode.PermissionDenied);
  }

  static validateMfaEnabled(mfaEnabled: boolean): void {
    if (!mfaEnabled) {
      this.handleMfaNotEnabled();
    }
  }

  static validateMfaNotEnabled(mfaEnabled: boolean): void {
    if (mfaEnabled) {
      this.handleMfaAlreadySetup();
    }
  }

  static validateBackupCode(code: string): void {
    if (!code || code.length !== 8) {
      this.handleInvalidBackupCode();
    }
  }

  static validateOtp(otp: string): void {
    if (!otp || otp.length !== 6) {
      this.handleInvalidOtp();
    }
  }
}
