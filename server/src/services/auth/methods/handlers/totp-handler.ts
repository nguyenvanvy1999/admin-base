import type { authenticator } from 'otplib';
import type { AuthUserService } from 'src/services/auth/core/auth-user.service';
import type {
  AuthMethodContext,
  AuthMethodResult,
  IAuthMethodHandler,
} from 'src/services/auth/types/auth-method-handler.interface';
import { AuthMethod, AuthMethodType } from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode } from 'src/share';
import type { MethodRegistryService } from '../method-registry.service';

export class TotpHandler implements IAuthMethodHandler {
  readonly type = AuthMethodType.TOTP;

  constructor(
    private readonly deps: {
      authenticator: typeof authenticator;
      authUserService: AuthUserService;
    },
  ) {}

  async verify(context: AuthMethodContext): Promise<AuthMethodResult> {
    const { userId, code } = context;

    const user = await this.deps.authUserService.loadUserForAuth(userId);

    if (!user.totpSecret) {
      throw new BadReqErr(ErrCode.MfaBroken);
    }

    const verified = this.deps.authenticator.verify({
      secret: user.totpSecret,
      token: code,
    });

    return {
      verified,
      errorCode: verified ? undefined : ErrCode.InvalidOtp,
    };
  }

  getAuthMethod(): string {
    return AuthMethod.TOTP;
  }

  static registerCapability(registry: MethodRegistryService): void {
    registry.register({
      method: AuthMethodType.TOTP,
      label: 'Authenticator App',
      description: 'Use your TOTP authenticator app',
      requiresSetup: true,
      isAvailable: (context) => {
        return Promise.resolve(context.user.mfaTotpEnabled === true);
      },
    });
  }
}
