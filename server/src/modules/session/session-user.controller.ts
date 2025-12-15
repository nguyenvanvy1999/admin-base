import { Elysia, t } from 'elysia';
import { SessionPaginateDto, SessionPagingResDto } from 'src/dtos/session.dto';
import { authCheck } from 'src/services/auth';
import { sessionService } from 'src/services/auth/session.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const sessionUserController = new Elysia({
  prefix: '/sessions',
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
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
  );
