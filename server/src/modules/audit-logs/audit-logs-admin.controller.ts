import { Elysia } from 'elysia';
import {
  AuditLogListQueryDto,
  AuditLogListResDto,
} from 'src/dtos/audit-logs.dto';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { authCheck, authorize, has } from 'src/services/auth';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

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
  );
