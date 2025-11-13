import type { User } from '@server/generated/prisma/client';
import { prisma } from '@server/libs/db';
import { ArrayUtil, DB_PREFIX, IdUtil } from '@server/share';
import type { ITokenPayload, UPermission } from '@server/share/type';
import dayjs from 'dayjs';
import { sessionService } from './session.service';
import { tokenService } from './token.service';

export { tokenService };

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
    createdAt: Date;
    updatedAt: Date;
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
    user: User & { roles: { roleId: string }[] },
    clientIp: string,
    userAgent: string,
  ): Promise<ILoginRes> {
    await sessionService.revoke(user.id);
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
