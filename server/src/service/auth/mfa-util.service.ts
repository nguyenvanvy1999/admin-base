import { type IMFACache, mfaCache } from 'src/config/cache';
import {
  CoreErr,
  ErrCode,
  IdUtil,
  type IUserMFA,
  type SecurityDeviceInsight,
} from 'src/share';

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
    security,
  }: {
    loginToken: string;
    user: IUserMFA;
    security?: SecurityDeviceInsight;
  }): Promise<string> {
    const mfaToken = this.generateToken();
    if (user.mfaTotpEnabled && user.totpSecret) {
      await this.cache.set(this.getKey(mfaToken, loginToken), {
        userId: user.id,
        security,
      });
      return mfaToken;
    }
    throw new CoreErr(ErrCode.MfaBroken);
  }
}

export const mfaUtilService = new MfaUtilService(mfaCache, IdUtil.token16);
