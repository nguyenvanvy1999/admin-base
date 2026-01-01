import type { authenticator } from 'otplib';
import type { AuthUserService } from 'src/services/auth/core/auth-user.service';
import type {
  AuthMethodContext,
  AuthMethodResult,
  IAuthMethodHandler,
} from 'src/services/auth/types/auth-method-handler.interface';
import {
  AuthChallengeType,
  AuthMethod,
} from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode } from 'src/share';

export class TotpHandler implements IAuthMethodHandler {
  readonly type = AuthChallengeType.MFA_TOTP;

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
}
