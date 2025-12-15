import { Elysia, t } from 'elysia';
import {
  ResolveSecurityEventDto,
  SecurityEventListQueryDto,
  SecurityEventListResDto,
} from 'src/dtos/security-events.dto';
import { authCheck, authorize, has } from 'src/service/auth';
import { securityEventsService } from 'src/service/security-events/security-events.service';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const securityEventsAdminController = new Elysia({
  prefix: '/admin/security-events',
  tags: [DOC_TAG.ADMIN_AUDIT_LOG],
})
  .use(authCheck)
  .use(authorize(has('SECURITY_EVENT.VIEW')))
  .get(
    '/',
    async ({ currentUser, query }) => {
      const result = await securityEventsService.list({
        ...query,
        created0: query.created0?.toISOString(),
        created1: query.created1?.toISOString(),
        currentUserId: currentUser.id,
        hasViewPermission: currentUser.permissions.includes(
          'SECURITY_EVENT.VIEW',
        ),
      });
      return castToRes(result);
    },
    {
      query: SecurityEventListQueryDto,
      response: {
        200: ResWrapper(SecurityEventListResDto),
        ...authErrors,
      },
    },
  )
  .post(
    '/resolve',
    async ({ currentUser, body }) => {
      await securityEventsService.resolve({
        id: body.id,
        resolvedBy: currentUser.id,
      });
      return castToRes({ success: true });
    },
    {
      body: ResolveSecurityEventDto,
      response: {
        200: ResWrapper(t.Object({ success: t.Boolean() })),
        ...authErrors,
      },
    },
  );
