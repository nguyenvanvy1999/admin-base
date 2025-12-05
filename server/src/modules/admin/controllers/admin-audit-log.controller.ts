import { Elysia } from 'elysia';
import {
  AuditLogListQueryDto,
  AuditLogListResDto,
} from 'src/modules/admin/dtos';
import { auditLogAdminService } from 'src/service/admin';
import { anyOf, authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ResWrapper,
} from 'src/share';

export const adminAuditLogController = new Elysia<'', AppAuthMeta>({
  tags: [DOC_TAG.ADMIN_AUDIT_LOG],
}).group('/audit-logs', (app) =>
  app
    .use(authorize(anyOf(has('AUDIT_LOG.VIEW_ALL'), has('AUDIT_LOG.VIEW'))))
    .get(
      '/',
      async ({ currentUser, query }) => {
        const result = await auditLogAdminService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewAllPermission:
            currentUser.permissions.includes('AUDIT_LOG.VIEW_ALL'),
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
