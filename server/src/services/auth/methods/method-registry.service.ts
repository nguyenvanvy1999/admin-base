import type { User } from 'src/generated';
import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type { AuthChallengeType } from 'src/services/auth/types/constants';
import type { SettingsService } from 'src/services/settings/settings.service';
import { settingsService } from 'src/services/settings/settings.service';
import { SETTING } from 'src/share';
import type {
  AuthMethodConfig,
  AuthMethodOption,
  AuthTx,
} from 'src/types/auth.types';

export interface MethodAvailabilityContext {
  user: Pick<User, 'id' | 'email' | 'mfaTotpEnabled'>;
  authTx: AuthTx;
  securityResult?: SecurityCheckResult;
}

export interface MethodCapability {
  method: AuthChallengeType;
  label: string;
  description?: string;
  requiresSetup: boolean;
  isAvailable: (context: MethodAvailabilityContext) => Promise<boolean>;
}

export class MethodRegistryService {
  private capabilities: Map<AuthChallengeType, MethodCapability> = new Map();

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

  async getAvailableMethods(
    context: MethodAvailabilityContext,
    challengeType: 'mfaRequired' | 'deviceVerify' | 'mfaEnroll',
  ): Promise<AuthMethodOption[]> {
    const config = await this.deps.settingService.getSetting<AuthMethodConfig>(
      SETTING.AUTH_METHODS_CONFIG,
    );

    const challengeConfig = config[challengeType];
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
