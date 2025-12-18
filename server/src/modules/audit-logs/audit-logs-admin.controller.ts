import { Elysia, t } from 'elysia';
import {
  AuditLogListQueryDto,
  AuditLogListResDto,
} from 'src/dtos/audit-logs.dto';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { authCheck, authorize, has } from 'src/services/auth';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  ResWrapper,
} from 'src/share';

export const auditLogsAdminController = new Elysia({
  prefix: '/admin/audit-logs',
  tags: [DOC_TAG.ADMIN_AUDIT_LOG],
})
  .use(authCheck)
  .use(authorize(has('AUDIT_LOG.VIEW')))
  .get(
    '/',
    async ({ currentUser, query }) => {
      const result = await auditLogsService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission: true,
      });
      return castToRes(result);
    },
    {
      query: AuditLogListQueryDto,
      response: {
        200: ResWrapper(AuditLogListResDto),
        ...authErrors,
      },
    },
  )
  .use(authorize(has('AUDIT_LOG.VIEW')))
  .post(
    '/:id/resolve',
    async ({ params: { id }, currentUser }) => {
      const result = await auditLogsService.resolveSecurityEvent(id, {
        currentUserId: currentUser.id,
      });
      return castToRes(result);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(
          t.Object({
            success: t.Boolean(),
          }),
        ),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  );
