import { Elysia } from 'elysia';
import {
  SecurityEventListQueryDto,
  SecurityEventListResDto,
} from 'src/dtos/security-events.dto';
import { authCheck } from 'src/service/auth/auth.middleware';
import { securityEventService } from 'src/service/misc/security-event.service';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const securityEventsUserController = new Elysia({
  prefix: '/security-events',
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .get(
    '/',
    async ({ currentUser, query }) => {
      const result = await securityEventService.list({
        ...query,
        created0: query.created0?.toISOString(),
        created1: query.created1?.toISOString(),
        userId: currentUser.id,
        currentUserId: currentUser.id,
        hasViewPermission: false,
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
  );
