import type { authenticator } from 'otplib';
import { BadReqErr, ErrCode } from 'src/share';
import type { AuthUserService } from '../../core/auth-user.service';
import type {
  AuthMethodContext,
  AuthMethodResult,
  IAuthMethodHandler,
} from '../../types/auth-method-handler.interface';
import { AuthChallengeType, AuthMethod } from '../../types/constants';

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
