import { Elysia, t } from 'elysia';
import { SessionPaginateDto, SessionPagingResDto } from 'src/dtos/session.dto';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { authCheck, authorize, has } from 'src/services/auth';
import { sessionService } from 'src/services/auth/session.service';
import {
  ACTIVITY_TYPE,
  AuditEventCategory,
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
    async ({ body, currentUser }) => {
      const ids = (body as typeof IdsDto.static).ids;
      await sessionService.revokeMany(ids);
      if (ids.length > 0) {
        await auditLogsService.pushBatch(
          ids.map((sessionId) => ({
            type: ACTIVITY_TYPE.REVOKE_SESSION as const,
            userId: currentUser.id,
            payload: {
              category: AuditEventCategory.CUD,
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
