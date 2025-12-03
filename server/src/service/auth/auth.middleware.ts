import type { Elysia, redirect as Redirect } from 'elysia';
import { currentUserCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { UserStatus } from 'src/generated';
import {
  ctxStore,
  ErrCode,
  type ICurrentUser,
  NotFoundErr,
  SYS_USER_ID,
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

function parseCookies(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    const value = rest.join('=').trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

async function verifyAdminAccess(headers: {
  authorization?: string;
  cookie?: string;
}): Promise<boolean> {
  try {
    const authorization = headers.authorization;
    let token: string | undefined;

    if (authorization && authorization.startsWith(`${AUTH_HEADER} `)) {
      token = authorization.slice(AUTH_HEADER.length + 1);
    }

    if (!token) {
      const cookies = parseCookies(headers.cookie);
      token = cookies['ADMIN_TOKEN'];
    }

    if (!token) {
      return false;
    }

    const { data } = await tokenService.verifyAccessToken(token);
    return data?.userId === SYS_USER_ID;
  } catch {
    return false;
  }
}

export const adminAuthMiddleware = async ({
  request,
  path,
  redirect,
}: {
  request: Request;
  redirect: Redirect;
  path: string;
}) => {
  if (
    path.startsWith('/swagger') ||
    path.startsWith('/queues') ||
    path.startsWith('/admin')
  ) {
    const res = await verifyAdminAccess({
      authorization: request.headers.get('authorization') || undefined,
      cookie: request.headers.get('cookie') || undefined,
    });
    if (!res) return redirect('/');
  }
  return;
};
