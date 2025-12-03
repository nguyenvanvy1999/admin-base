import { Elysia, t } from 'elysia';
import {
  SessionPaginateDto,
  SessionPagingResDto,
} from 'src/modules/admin/dtos';
import { anyOf, authorize, has } from 'src/service/auth/authorization';
import { sessionService } from 'src/service/auth/session.service';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const adminSessionController = new Elysia<'admin-session', AppAuthMeta>({
  tags: [DOC_TAG.ADMIN_SESSION],
}).group('/sessions', (app) =>
  app
    .use(authorize(anyOf(has('SESSION.VIEW_ALL'), has('SESSION.VIEW'))))
    .get(
      '/',
      async ({ currentUser, query }) => {
        const result = await sessionService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewAllPermission:
            currentUser.permissions.includes('SESSION.VIEW_ALL'),
        });
        return castToRes(result);
      },
      {
        query: SessionPaginateDto,
        response: {
          200: ResWrapper(SessionPagingResDto),
          ...authErrors,
        },
      },
    )
    .use(authorize(anyOf(has('SESSION.REVOKE_ALL'), has('SESSION.REVOKE'))))
    .post(
      '/revoke',
      async ({ body, currentUser }) => {
        const ids = (body as typeof IdsDto.static).ids;

        if (currentUser.permissions.includes('SESSION.REVOKE_ALL')) {
          await sessionService.revokeMany(ids);
        } else {
          await sessionService.revoke(currentUser.id, ids);
        }

        return castToRes(null);
      },
      {
        body: IdsDto,
        response: {
          200: ResWrapper(t.Null()),
          400: ErrorResDto,
          ...authErrors,
        },
      },
    ),
);
