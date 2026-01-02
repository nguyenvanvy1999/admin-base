import type { AuthMethodOption } from 'src/dtos/auth.dto';
import type { User } from 'src/generated';
import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type { AuthTx } from 'src/types/auth.types';
import type { MethodRegistryService } from '../methods/method-registry.service';
import { getMethodRegistry } from '../methods/method-registry-init';

export interface ResolveAvailableMethodsContext {
  user: Pick<User, 'id' | 'email' | 'mfaTotpEnabled' | 'status'>;
  authTx: AuthTx;
  securityResult?: SecurityCheckResult;
  challengeType: 'MFA_REQUIRED' | 'DEVICE_VERIFY';
}

export class ChallengeResolverService {
  constructor(
    private readonly deps: {
      methodRegistry: MethodRegistryService;
    } = {
      methodRegistry: getMethodRegistry(),
    },
  ) {}

  resolveAvailableMethods(
    context: ResolveAvailableMethodsContext,
  ): Promise<AuthMethodOption[]> {
    const { user, authTx, securityResult, challengeType } = context;

    let configKey: 'mfaRequired' | 'deviceVerify';
    switch (challengeType) {
      case 'MFA_REQUIRED':
        configKey = 'mfaRequired';
        break;
      case 'DEVICE_VERIFY':
        configKey = 'deviceVerify';
        break;
      default:
        return Promise.resolve([]);
    }

    return this.deps.methodRegistry.getAvailableMethods(
      {
        user,
        authTx,
        securityResult,
      },
      configKey,
    );
  }
}
