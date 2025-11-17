import type { IDb } from '@server/configs/db';
import { prisma } from '@server/configs/db';
import type { User } from '@server/generated';
import type { ITokenPayload, UPermission } from '@server/share';
import { ArrayUtil, DB_PREFIX, type IdUtil, idUtil } from '@server/share';
import dayjs from 'dayjs';
import type { SessionService } from './session.service';
import { sessionService } from './session.service';
import type { TokenService } from './token.service';
import { tokenService } from './token.service';

export enum LoginResType {
  COMPLETED = 'completed',
}

export interface ILoginRes {
  type: LoginResType;
  accessToken: string;
  refreshToken: string;
  exp: number;
  expired: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    created: Date;
    modified: Date;
    baseCurrencyId: string | null;
    settings: any;
    permissions: UPermission[];
  };
}

export class UserUtilService {
  constructor(
    private readonly deps: {
      db: IDb;
      sessionService: SessionService;
      tokenService: TokenService;
      idUtil: IdUtil;
    } = {
      db: prisma,
      sessionService,
      tokenService,
      idUtil,
    },
  ) {}

  async getPermissions(user: {
    roles: { roleId: string }[];
  }): Promise<UPermission[]> {
    const permissions = await this.deps.db.rolePermission.findMany({
      where: { roleId: { in: user.roles.map((x) => x.roleId) } },
      select: { permission: { select: { title: true } } },
    });
    return ArrayUtil.uniq(
      permissions.map((x) => x.permission.title),
    ) as UPermission[];
  }

  async completeLogin(
    user: User & { roles: { roleId: string }[] },
    clientIp: string,
    userAgent: string,
  ): Promise<ILoginRes> {
    await this.deps.sessionService.revoke(user.id, false, [], undefined);
    const sessionId = this.deps.idUtil.dbId(DB_PREFIX.SESSION);
    const payload: ITokenPayload = {
      userId: user.id,
      timestamp: Date.now(),
      sessionId,
      clientIp,
      userAgent,
    };

    const [
      { accessToken, expirationTime },
      { refreshToken, expirationTime: refreshTokenExpirationTime },
    ] = await Promise.all([
      this.deps.tokenService.createAccessToken(payload),
      this.deps.tokenService.createRefreshToken(),
    ]);

    await this.deps.db.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          id: sessionId,
          device: userAgent,
          ip: clientIp,
          userId: user.id,
          expired: refreshTokenExpirationTime,
          token: refreshToken,
        },
        select: { id: true },
      });
    });

    const userRes = {
      id: user.id,
      username: user.username,
      name: user.name,
      created: user.created,
      modified: user.modified,
      baseCurrencyId: user.baseCurrencyId,
      settings: user.settings,
      permissions: await this.getPermissions(user),
    };

    return {
      type: LoginResType.COMPLETED,
      accessToken,
      refreshToken,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user: userRes,
    };
  }
}

export const userUtilService = new UserUtilService();
