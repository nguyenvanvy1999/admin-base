import { Elysia } from 'elysia';
import { auditLogsService } from 'src/service/audit-logs.service';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';
import { AuditLogListQueryDto, AuditLogListResDto } from './audit-logs.dto';

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
