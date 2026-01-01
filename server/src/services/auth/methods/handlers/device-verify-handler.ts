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
import { BadReqErr, ErrCode, PurposeVerify } from 'src/share';

export class DeviceVerifyHandler implements IAuthMethodHandler {
  readonly type = AuthChallengeType.DEVICE_VERIFY;

  constructor(
    private readonly deps: {
      otpService: OtpService;
    },
  ) {}

  async verify(context: AuthMethodContext): Promise<AuthMethodResult> {
    const { authTx, userId, code } = context;

    if (!authTx.deviceVerifyToken) {
      throw new BadReqErr(ErrCode.InvalidState);
    }

    const verifiedUserId = await this.deps.otpService.verifyOtp(
      authTx.deviceVerifyToken,
      PurposeVerify.DEVICE_VERIFY,
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
