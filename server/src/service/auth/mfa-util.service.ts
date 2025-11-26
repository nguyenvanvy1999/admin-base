import { type IMFACache, mfaCache } from 'src/config/cache';
import { CoreErr, ErrCode, IdUtil, type IUserMFA } from 'src/share';

type TokenGenerator = () => string;

export class MfaUtilService {
  constructor(
    private readonly cache: IMFACache,
    private readonly generateToken: TokenGenerator,
  ) {}

  getKey(mfaToken: string, loginToken: string): string {
    return `${mfaToken}_${loginToken}`;
  }

  async createSession({
    loginToken,
    user,
  }: {
    loginToken: string;
    user: IUserMFA;
  }): Promise<string> {
    const mfaToken = this.generateToken();
    if (user.mfaTotpEnabled && user.totpSecret) {
      // we're using mix key with sessionId and refToken, for check that this MFA verify is only from one login session
      await this.cache.set(this.getKey(mfaToken, loginToken), {
        userId: user.id,
      });
      return mfaToken;
    }
    throw new CoreErr(ErrCode.MfaBroken);
  }
}

export const mfaUtilService = new MfaUtilService(mfaCache, IdUtil.token16);
