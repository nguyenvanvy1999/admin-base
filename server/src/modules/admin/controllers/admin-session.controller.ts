import { Elysia, t } from 'elysia';
import {
  SessionPaginateDto,
  SessionPagingResDto,
} from 'src/modules/admin/dtos';
import { authorize, has } from 'src/service/auth/authorization';
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
    .use(authorize(has('SESSION.VIEW')))
    .get(
      '/',
      async ({ currentUser, query }) => {
        const result = await sessionService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission: currentUser.permissions.includes('SESSION.VIEW'),
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
    .use(authorize(has('SESSION.REVOKE')))
    .post(
      '/revoke',
      async ({ body }) => {
        const ids = (body as typeof IdsDto.static).ids;
        await sessionService.revokeMany(ids);
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
