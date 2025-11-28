import { type IMFACache, mfaCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { type User, UserStatus } from 'src/generated';
import {
  BadReqErr,
  CoreErr,
  ErrCode,
  IdUtil,
  type IUserMFA,
  NotFoundErr,
  type SecurityDeviceInsight,
} from 'src/share';

type TokenGenerator = () => string;

export class MfaUtilService {
  constructor(
    private readonly cache: IMFACache,
    private readonly generateToken: TokenGenerator,
  ) {}

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
      await this.cache.set(mfaToken, {
        userId: user.id,
        security,
        loginToken,
        createdAt: Date.now(),
      });
      return mfaToken;
    }
    throw new CoreErr(ErrCode.MfaBroken);
  }

  async getMfaContext(mfaToken: string): Promise<{
    cachedData: {
      userId: string;
      security?: SecurityDeviceInsight;
      loginToken: string;
      createdAt: number;
    };
    user: User & { roles: { roleId: string }[] };
    isValid: boolean;
  }> {
    const cachedData = await this.cache.get(mfaToken);
    if (!cachedData) {
      throw new BadReqErr(ErrCode.SessionExpired);
    }

    const user = await db.user.findUnique({
      where: { id: cachedData.userId },
      include: { roles: true },
    });

    if (!user || user.status !== UserStatus.active) {
      throw new NotFoundErr(ErrCode.UserNotActive);
    }

    return { cachedData, user, isValid: true };
  }
}

export const mfaUtilService = new MfaUtilService(mfaCache, IdUtil.token16);
