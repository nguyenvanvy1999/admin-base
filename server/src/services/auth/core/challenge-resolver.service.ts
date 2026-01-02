import type { AuthMethodOption } from 'src/dtos/auth.dto';
import type { MethodRegistryService } from '../methods/method-registry.service';
import { getMethodRegistry } from '../methods/method-registry-init';
import type { AuthContext } from '../types/auth-method-handler.interface';

export class ChallengeResolverService {
  constructor(
    private readonly deps: {
      methodRegistry: MethodRegistryService;
    } = {
      methodRegistry: getMethodRegistry(),
    },
  ) {}

  resolveAvailableMethods(context: AuthContext): Promise<AuthMethodOption[]> {
    return this.deps.methodRegistry.getAvailableMethods(context);
  }
}
