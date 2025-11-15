import { prisma } from '@server/configs/db';
import type { User } from '@server/generated';
import type { ITokenPayload, UPermission } from '@server/share';
import { ArrayUtil, DB_PREFIX, IdUtil } from '@server/share';
import dayjs from 'dayjs';
import { sessionService } from './session.service';
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

export const userUtilService = {
  async getPermissions(user: {
    roles: { roleId: string }[];
  }): Promise<UPermission[]> {
    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: { in: user.roles.map((x) => x.roleId) } },
      select: { permission: { select: { title: true } } },
    });
    return ArrayUtil.uniq(
      permissions.map((x) => x.permission.title),
    ) as UPermission[];
  },

  async completeLogin(
    user: User & { roles: { roleId: string }[]; deletedAt?: Date | null },
    clientIp: string,
    userAgent: string,
  ): Promise<ILoginRes> {
    await sessionService.revoke(user.id, false, []);
    const sessionId = IdUtil.dbId(DB_PREFIX.SESSION);
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
      tokenService.createAccessToken(payload),
      tokenService.createRefreshToken(),
    ]);

    await prisma.$transaction(async (tx) => {
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
      permissions: await userUtilService.getPermissions(user),
    };

    return {
      type: LoginResType.COMPLETED,
      accessToken,
      refreshToken,
      exp: expirationTime.getTime(),
      expired: dayjs(expirationTime).format(),
      user: userRes,
    };
  },
};
