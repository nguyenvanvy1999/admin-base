import { Elysia, t } from 'elysia';
import {
  SessionPaginateDto,
  SessionPagingResDto,
} from 'src/modules/admin/dtos';
import { authCheck } from 'src/service/auth/auth.middleware';
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

export const userSessionController = new Elysia<'user-session', AppAuthMeta>({
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .group('/sessions', (app) =>
    app
      .get(
        '/',
        async ({ currentUser, query }) => {
          const result = await sessionService.list({
            ...query,
            currentUserId: currentUser.id,
            hasViewPermission: false,
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
      .post(
        '/revoke',
        async ({ body, currentUser }) => {
          const ids = (body as typeof IdsDto.static).ids;
          await sessionService.revoke(currentUser.id, ids);
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
