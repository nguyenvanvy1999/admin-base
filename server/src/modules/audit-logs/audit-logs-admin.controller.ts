import { Elysia } from 'elysia';
import {
  AuditLogListQueryDto,
  AuditLogListResDto,
} from 'src/dtos/audit-logs.dto';
import { auditLogsService } from 'src/service/audit-logs.service';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
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
        hasViewPermission: currentUser.permissions.includes('AUDIT_LOG.VIEW'),
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
