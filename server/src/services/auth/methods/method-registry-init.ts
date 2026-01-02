import { AuthMethodType } from '../types/constants';
import { AuthMethodRegistry } from './auth-method-registry.service';
import {
  backupCodeCapability,
  backupCodeHandler,
  deviceVerifyCapability,
  deviceVerifyHandler,
  emailOtpCapability,
  emailOtpHandler,
  totpCapability,
  totpHandler,
} from './handlers';

let registryInstance: AuthMethodRegistry | null = null;

export function getMethodRegistry(): AuthMethodRegistry {
  if (!registryInstance) {
    registryInstance = new AuthMethodRegistry();

    registryInstance.register(
      AuthMethodType.TOTP,
      totpHandler.verify,
      totpHandler.getAuthMethod,
      totpCapability,
    );

    registryInstance.register(
      AuthMethodType.BACKUP_CODE,
      backupCodeHandler.verify,
      backupCodeHandler.getAuthMethod,
      backupCodeCapability,
    );

    registryInstance.register(
      AuthMethodType.EMAIL_OTP,
      emailOtpHandler.verify,
      emailOtpHandler.getAuthMethod,
      emailOtpCapability,
    );

    registryInstance.register(
      AuthMethodType.DEVICE_VERIFY,
      deviceVerifyHandler.verify,
      deviceVerifyHandler.getAuthMethod,
      deviceVerifyCapability,
    );
  }

  return registryInstance;
}
