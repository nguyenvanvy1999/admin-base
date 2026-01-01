import type { Elysia } from 'elysia';
import { ErrCode, UnAuthErr } from 'src/share';
import {
  type AuthMiddlewareService,
  authMiddlewareService,
} from './auth-middleware.service';

const AUTH_HEADER = 'Bearer';

export const createAuthCheck = (
  service: AuthMiddlewareService = authMiddlewareService,
) => {
  return (app: Elysia) =>
    app
      .guard({ as: 'scoped' })
      .resolve({ as: 'local' }, async ({ headers }) => {
        const authorization = headers['authorization'];
        if (!authorization) {
          throw new UnAuthErr(ErrCode.InvalidToken);
        }

        const token = authorization.slice(AUTH_HEADER.length + 1);
        const currentUser = await service.authenticateFromToken(token);

        return { currentUser };
      });
};

export const authCheck = createAuthCheck();
