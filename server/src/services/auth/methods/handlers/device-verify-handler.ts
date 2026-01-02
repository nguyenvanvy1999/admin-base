import type {
  AuthMethodContext,
  AuthMethodResult,
} from 'src/services/auth/types/auth-method-handler.interface';
import { AuthMethod, AuthMethodType } from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode, PurposeVerify } from 'src/share';
import { otpService } from '../otp.service';

export const deviceVerifyHandler = {
  verify: async (context: AuthMethodContext): Promise<AuthMethodResult> => {
    const { authTx, userId, code } = context;

    if (!authTx.deviceVerifyToken) {
      throw new BadReqErr(ErrCode.InvalidState);
    }

    const verifiedUserId = await otpService.verifyOtp(
      authTx.deviceVerifyToken,
      PurposeVerify.DEVICE_VERIFY,
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

export const deviceVerifyCapability = {
  method: AuthMethodType.DEVICE_VERIFY,
  label: 'Email Verification',
  description: 'Receive code via email',
  requiresSetup: false,
  isAvailable: () => {
    return Promise.resolve(true);
  },
};
