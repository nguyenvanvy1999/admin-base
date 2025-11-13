import { prisma } from '@server/libs/db';
import { ErrCode, NotFoundErr, UnAuthErr } from '@server/share';
import type { ICurrentUser } from '@server/share/type';
import type { Elysia } from 'elysia';
import { tokenService, userUtilService } from './auth-util.service';

const AUTH_HEADER = 'Bearer';

export const userResSelect = {
  id: true,
  username: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { roleId: true } },
} as const;

export const authCheck = (app: Elysia) =>
  app.guard({ as: 'scoped' }).resolve({ as: 'local' }, async ({ headers }) => {
    const authorization = headers['authorization'];
    if (!authorization) {
      throw new UnAuthErr(ErrCode.InvalidToken);
    }
    const token = authorization.slice(AUTH_HEADER.length + 1);

    const { data } = await tokenService.verifyAccessToken(token);
    let currentUser: ICurrentUser;

    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
      select: {
        id: true,
        revoked: true,
        expired: true,
        userId: true,
      },
    });

    if (!session || session.revoked || new Date() > session.expired) {
      throw new UnAuthErr(ErrCode.ExpiredToken);
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: userResSelect,
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    currentUser = {
      id: user.id,
      sessionId: data.sessionId,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      baseCurrencyId: null,
      settings: null,
      permissions: await userUtilService.getPermissions(user),
      roleIds: user.roles.map((x) => x.roleId),
    };

    return { currentUser };
  });
