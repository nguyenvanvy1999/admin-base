import { Elysia } from 'elysia';
import {
  AuditLogListQueryDto,
  AuditLogListResDto,
} from 'src/dtos/audit-logs.dto';
import { auditLogsService } from 'src/service/audit-logs/audit-logs.service';
import { authCheck } from 'src/service/auth/middleware';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const auditLogsUserController = new Elysia({
  prefix: '/audit-logs',
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .get(
    '/',
    async ({ currentUser, query }) => {
      const result = await auditLogsService.list({
        ...query,
        userId: currentUser.id,
        currentUserId: currentUser.id,
        hasViewPermission: false,
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
