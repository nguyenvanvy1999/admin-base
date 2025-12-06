import { Elysia, t } from 'elysia';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import { sessionService } from 'src/service/auth/session.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';
import { SessionPaginateDto, SessionPagingResDto } from './session.dto';

export const sessionAdminController = new Elysia({
  prefix: '/admin/sessions',
  tags: [DOC_TAG.ADMIN_SESSION],
})
  .use(authCheck)
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
  );
