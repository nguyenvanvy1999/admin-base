import { BackupCodeHandler } from './handlers/backup-code-handler';
import { DeviceVerifyHandler } from './handlers/device-verify-handler';
import { EmailOtpHandler } from './handlers/email-otp-handler';
import { TotpHandler } from './handlers/totp-handler';
import { MethodRegistryService } from './method-registry.service';

let registryInstance: MethodRegistryService | null = null;

export function getMethodRegistry(): MethodRegistryService {
  if (!registryInstance) {
    registryInstance = new MethodRegistryService();

    TotpHandler.registerCapability(registryInstance);
    BackupCodeHandler.registerCapability(registryInstance);
    EmailOtpHandler.registerCapability(registryInstance);
    DeviceVerifyHandler.registerCapability(registryInstance);
  }

  return registryInstance;
}
