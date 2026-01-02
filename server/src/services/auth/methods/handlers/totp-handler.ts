import { authenticator } from 'otplib';
import { authUserService } from 'src/services/auth/core/auth-user.service';
import type {
  AuthMethodContext,
  AuthMethodResult,
} from 'src/services/auth/types/auth-method-handler.interface';
import { AuthMethod, AuthMethodType } from 'src/services/auth/types/constants';
import { BadReqErr, ErrCode } from 'src/share';

export const totpHandler = {
  verify: async (context: AuthMethodContext): Promise<AuthMethodResult> => {
    const { userId, code } = context;

    const user = await authUserService.loadUserForAuth(userId);

    if (!user.totpSecret) {
      throw new BadReqErr(ErrCode.MfaBroken);
    }

    const verified = authenticator.verify({
      secret: user.totpSecret,
      token: code,
    });

    return {
      verified,
      errorCode: verified ? undefined : ErrCode.InvalidOtp,
    };
  },

  getAuthMethod: (): string => {
    return AuthMethod.TOTP;
  },
};

export const totpCapability = {
  method: AuthMethodType.TOTP,
  label: 'Authenticator App',
  description: 'Use your TOTP authenticator app',
  requiresSetup: true,
  isAvailable: (context: { user: { mfaTotpEnabled: boolean } }) => {
    return Promise.resolve(context.user.mfaTotpEnabled === true);
  },
};
