import { Elysia, t } from 'elysia';
import {
  AuditLogListQueryDto,
  AuditLogListResDto,
} from 'src/dtos/audit-logs.dto';
import { auditLogsService } from 'src/services/audit-logs/audit-logs.service';
import { authCheck } from 'src/services/auth';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrCode,
  ErrorResDto,
  type ICurrentUser,
  IdDto,
  ResWrapper,
  UnAuthErr,
} from 'src/share';

const canAuditLogView = (user: ICurrentUser) =>
  user.permissions.includes('AUDIT_LOG.VIEW');

export const auditLogsController = new Elysia({
  prefix: '/audit-logs',
  tags: [DOC_TAG.ADMIN_AUDIT_LOG],
  detail: { security: ACCESS_AUTH },
})
  .use(authCheck)
  .get(
    '/',
    async ({ currentUser, query }) => {
      const hasViewPermission = canAuditLogView(currentUser);

      const result = await auditLogsService.list({
        ...query,
        currentUserId: currentUser.id,
        hasViewPermission,
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
  .post(
    '/:id/resolve',
    async ({ params: { id }, currentUser }) => {
      if (!canAuditLogView(currentUser)) {
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }

      const result = await auditLogsService.resolveSecurityEvent(id, {
        currentUserId: currentUser.id,
      });

      return castToRes(
        result ?? {
          success: true,
        },
      );
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
