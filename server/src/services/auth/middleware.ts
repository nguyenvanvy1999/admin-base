import type { Elysia } from 'elysia';
import { currentUserCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { UserStatus } from 'src/generated';
import {
  ctxStore,
  ErrCode,
  type ICurrentUser,
  NotFoundErr,
  UnAuthErr,
  userResSelect,
} from 'src/share';
import { tokenService, userUtilService } from './auth-util.service';

const AUTH_HEADER = 'Bearer';
export const authCheck = (app: Elysia) =>
  app.guard({ as: 'scoped' }).resolve({ as: 'local' }, async ({ headers }) => {
    const authorization = headers['authorization'];
    if (!authorization) {
      throw new UnAuthErr(ErrCode.InvalidToken);
    }
    const token = authorization.slice(AUTH_HEADER.length + 1);

    const { data } = await tokenService.verifyAccessToken(token);
    let currentUser: ICurrentUser;
    const cachedUser = await currentUserCache.get(data.sessionId);

    if (cachedUser) {
      currentUser = cachedUser;
    } else {
      const user = await db.user.findUnique({
        where: { id: data.userId },
        select: userResSelect,
      });
      if (!user) {
        throw new NotFoundErr(ErrCode.UserNotFound);
      }

      if (user.status !== UserStatus.active) {
        throw new UnAuthErr(ErrCode.UserNotActive);
      }

      const activeRoleIds = await userUtilService.getActiveRoleIds(user.id);

      currentUser = {
        ...user,
        sessionId: data.sessionId,
        permissions: await userUtilService.getPermissions(user),
        roleIds: activeRoleIds,
        notificationPreferences: null,
      };

      await currentUserCache.set(data.sessionId, currentUser);
    }

    const current = ctxStore.getStore();
    if (current) {
      current.userId = currentUser.id;
      current.sessionId = currentUser.sessionId;
    }

    return { currentUser };
  });
