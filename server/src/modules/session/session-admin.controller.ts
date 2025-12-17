import { Elysia, t } from 'elysia';
import { SessionPaginateDto, SessionPagingResDto } from 'src/dtos/session.dto';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { authCheck, authorize, has } from 'src/services/auth';
import { sessionService } from 'src/services/auth/session.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

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
        hasViewPermission: true,
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
  .use(authorize(has('SESSION.UPDATE')))
  .post(
    '/revoke',
    async ({ body }) => {
      const ids = (body as typeof IdsDto.static).ids;
      await sessionService.revokeMany(ids);
      if (ids.length > 0) {
        await auditLogsService.pushBatch(
          ids.map((sessionId) => ({
            type: 'cud' as const,
            payload: {
              category: 'cud',
              entityType: 'session',
              entityId: sessionId,
              action: 'delete',
              changes: { sessionId: { previous: sessionId, next: null } },
            },
          })),
        );
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
  );
