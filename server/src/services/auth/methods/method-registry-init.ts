import {
  BackupCodeHandler,
  DeviceVerifyHandler,
  EmailOtpHandler,
  TotpHandler,
} from './handlers';
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
