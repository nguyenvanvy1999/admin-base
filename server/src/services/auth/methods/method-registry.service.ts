import type { AuthMethodOption } from 'src/dtos/auth.dto';
import {
  type AuthMethodType,
  ChallengeType,
} from 'src/services/auth/types/constants';
import type { SettingsService } from 'src/services/settings/settings.service';
import { settingsService } from 'src/services/settings/settings.service';
import { SETTING } from 'src/share';
import type { AuthMethodConfig } from 'src/types/auth.types';
import type { AuthContext } from '../types/auth-method-handler.interface';

export interface MethodCapability {
  method: AuthMethodType;
  label: string;
  description?: string;
  requiresSetup: boolean;
  isAvailable: (context: AuthContext) => Promise<boolean>;
}

const CHALLENGE_CONFIG_MAP: Record<ChallengeType, keyof AuthMethodConfig> = {
  [ChallengeType.MFA_REQUIRED]: 'mfaRequired',
  [ChallengeType.DEVICE_VERIFY]: 'deviceVerify',
  [ChallengeType.MFA_ENROLL]: 'mfaEnroll',
};

export class MethodRegistryService {
  private capabilities: Map<AuthMethodType, MethodCapability> = new Map();

  constructor(
    private readonly deps: {
      settingService: SettingsService;
    } = {
      settingService: settingsService,
    },
  ) {}

  register(capability: MethodCapability): void {
    this.capabilities.set(capability.method, capability);
  }

  async getAvailableMethods(context: AuthContext): Promise<AuthMethodOption[]> {
    const config = await this.deps.settingService.getSetting<AuthMethodConfig>(
      SETTING.AUTH_METHODS_CONFIG,
    );
    const challengeType = context.challengeType;
    const configKey = CHALLENGE_CONFIG_MAP[challengeType];
    const challengeConfig = config[configKey];
    if (!challengeConfig) {
      return [];
    }

    const available: AuthMethodOption[] = [];

    for (const methodType of challengeConfig.enabled) {
      const capability = this.capabilities.get(methodType);
      if (!capability) {
        continue;
      }

      const isAvailable = await capability.isAvailable(context);
      if (isAvailable) {
        const labelConfig = challengeConfig.labels[methodType];
        available.push({
          method: methodType,
          label: labelConfig?.label || capability.label,
          description: labelConfig?.description || capability.description,
          requiresSetup: capability.requiresSetup,
        });
      }
    }

    return available;
  }
}
