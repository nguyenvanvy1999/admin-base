import { currentUserCache } from '@server/configs/cache';
import { prisma } from '@server/configs/db';
import { tokenService } from '@server/services/auth/token.service';
import type { ICurrentUser } from '@server/share';
import { ErrorCode, throwAppError } from '@server/share';
import type { Elysia } from 'elysia';
import { userUtilService } from './auth-util.service';

const AUTH_HEADER = 'Bearer';

export const userResSelect = {
  id: true,
  username: true,
  name: true,
  baseCurrencyId: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { roleId: true } },
} as const;

export const authCheck = (app: Elysia) =>
  app.guard({ as: 'scoped' }).resolve({ as: 'local' }, async ({ headers }) => {
    const authorization = headers['authorization'];
    if (!authorization) {
      throwAppError(ErrorCode.INVALID_TOKEN, 'Invalid token');
    }
    if (!authorization.startsWith(`${AUTH_HEADER} `)) {
      throwAppError(ErrorCode.INVALID_TOKEN, 'Invalid token format');
    }
    const token = authorization.slice(AUTH_HEADER.length + 1).trim();
    const { data } = await tokenService.verifyAccessToken(token);

    let currentUser: ICurrentUser;
    const cachedUser = await currentUserCache.get(data.sessionId);

    if (cachedUser) {
      currentUser = cachedUser;
    } else {
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
        throwAppError(ErrorCode.EXPIRED_TOKEN, 'Token expired');
      }

      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: userResSelect,
      });

      if (!user) {
        throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      currentUser = {
        id: user.id,
        sessionId: data.sessionId,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        baseCurrencyId: user.baseCurrencyId,
        settings: user.settings,
        permissions: await userUtilService.getPermissions(user),
        roleIds: user.roles.map((x) => x.roleId),
      };

      await currentUserCache.set(data.sessionId, currentUser);
    }

    return { currentUser };
  });
