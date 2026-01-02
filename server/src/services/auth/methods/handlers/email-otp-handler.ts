import { UserStatus } from 'src/generated';
import type { MfaService } from 'src/services/auth/methods/mfa.service';
import type { OtpService } from 'src/services/auth/methods/otp.service';
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
import type { MethodRegistryService } from '../method-registry.service';

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

  static registerCapability(registry: MethodRegistryService): void {
    registry.register({
      method: AuthChallengeType.MFA_EMAIL_OTP,
      label: 'Email OTP',
      description: 'Receive code via email',
      requiresSetup: false,
      isAvailable: (context) => {
        return Promise.resolve(context.user.status === UserStatus.active);
      },
    });
  }
}
