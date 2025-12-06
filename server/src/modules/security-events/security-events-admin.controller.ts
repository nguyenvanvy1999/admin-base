import { Elysia, t } from 'elysia';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import { securityEventService } from 'src/service/misc/security-event.service';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';
import {
  ResolveSecurityEventDto,
  SecurityEventListQueryDto,
  SecurityEventListResDto,
} from './security-events.dto';

export const securityEventsAdminController = new Elysia({
  prefix: '/admin/security-events',
  tags: [DOC_TAG.ADMIN_AUDIT_LOG],
})
  .use(authCheck)
  .use(authorize(has('SECURITY_EVENT.VIEW')))
  .get(
    '/',
    async ({ currentUser, query }) => {
      const result = await securityEventService.list({
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
      await securityEventService.resolve({
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
