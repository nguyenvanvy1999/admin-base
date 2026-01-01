import { BadReqErr, ErrCode } from 'src/share';
import type {
  AuthMethodContext,
  AuthMethodResult,
  IAuthMethodHandler,
} from '../../types/auth-method-handler.interface';
import { AuthChallengeType, AuthMethod } from '../../types/constants';
import type { MfaService } from '../mfa.service';
import type { OtpService } from '../otp.service';

export class EmailOtpHandler implements IAuthMethodHandler {
  readonly type = AuthChallengeType.MFA_EMAIL_OTP;

  constructor(
    private readonly deps: {
      mfaService: MfaService;
      otpService: OtpService;
    },
  ) {}

  async verify(context: AuthMethodContext): Promise<AuthMethodResult> {
    const { authTx, userId, code } = context;

    if (!authTx.emailOtpToken) {
      throw new BadReqErr(ErrCode.InvalidState);
    }

    const verifiedUserId = await this.deps.mfaService.verifyEmailOtp(
      authTx.emailOtpToken,
      code,
    );

    const verified = verifiedUserId === userId;

    return {
      verified,
      errorCode: verified ? undefined : ErrCode.InvalidOtp,
    };
  }

  getAuthMethod(): string {
    return AuthMethod.EMAIL;
  }
}
