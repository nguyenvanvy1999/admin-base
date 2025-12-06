import { Elysia } from 'elysia';
import { auditLogAdminService } from 'src/service/admin';
import { authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ResWrapper,
} from 'src/share';
import { AuditLogListQueryDto, AuditLogListResDto } from './audit-logs.dto';

export const auditLogsAdminController = new Elysia<'admin', AppAuthMeta>({
  prefix: 'admin',
  tags: [DOC_TAG.ADMIN_AUDIT_LOG],
}).group('/audit-logs', (app) =>
  app.use(authorize(has('AUDIT_LOG.VIEW'))).get(
    '/',
    async ({ currentUser, query }) => {
      const result = await auditLogAdminService.list({
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
  ),
);
