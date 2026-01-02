import { UserStatus } from 'src/generated';
import type {
  AuthMethodContext,
  AuthMethodResult,
} from 'src/services/auth/types/auth-method-handler.interface';
import { AuthMethod, AuthMethodType } from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode } from 'src/share';
import { mfaService } from '../mfa.service';

export const emailOtpHandler = {
  verify: async (context: AuthMethodContext): Promise<AuthMethodResult> => {
    const { authTx, userId, code } = context;

    if (!authTx.emailOtpToken) {
      throw new BadReqErr(ErrCode.InvalidState);
    }

    const verifiedUserId = await mfaService.verifyEmailOtp(
      authTx.emailOtpToken,
      code,
    );

    const verified = verifiedUserId === userId;

    return {
      verified,
      errorCode: verified ? undefined : ErrCode.InvalidOtp,
    };
  },

  getAuthMethod: (): string => {
    return AuthMethod.EMAIL;
  },
};

export const emailOtpCapability = {
  method: AuthMethodType.EMAIL_OTP,
  label: 'Email OTP',
  description: 'Receive code via email',
  requiresSetup: false,
  isAvailable: (context: { user: { status: UserStatus } }) => {
    return Promise.resolve(context.user.status === UserStatus.active);
  },
};
