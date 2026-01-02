import { Elysia, t } from 'elysia';
import { SessionPaginateDto, SessionPagingResDto } from 'src/dtos/session.dto';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { authCheck } from 'src/services/auth';
import { sessionService } from 'src/services/auth/session.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  type ICurrentUser,
  IdsDto,
  ResWrapper,
} from 'src/share';

const canSessionView = (user: ICurrentUser) =>
  user.permissions.includes('SESSION.VIEW');

const canSessionUpdate = (user: ICurrentUser) =>
  user.permissions.includes('SESSION.UPDATE');

export const sessionController = new Elysia({
  prefix: '/sessions',
  tags: [DOC_TAG.SESSION],
})
  .use(authCheck)
  .get(
    '/',
    async ({ currentUser, query }) => {
      const isAdminLike = canSessionView(currentUser);

      const result = await sessionService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: isAdminLike,
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

      const isAdminLike = canSessionUpdate(currentUser);

      if (isAdminLike) {
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
  );
