import { Elysia, t } from 'elysia';
import {
  BlockRateLimitDto,
  RateLimitListQueryDto,
  RateLimitListResDto,
  UnblockRateLimitDto,
} from 'src/dtos/rate-limit.dto';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import { rateLimitService } from 'src/service/rate-limit/rate-limit.service';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const rateLimitAdminController = new Elysia({
  prefix: '/admin/rate-limits',
  tags: [DOC_TAG.ADMIN_RATE_LIMIT],
})
  .use(authCheck)
  .use(authorize(has('RATE_LIMIT.VIEW')))
  .get(
    '/',
    async ({ query }) => {
      const result = await rateLimitService.list({
        ...query,
        created0: query.created0?.toISOString(),
        created1: query.created1?.toISOString(),
      });
      return castToRes(result);
    },
    {
      query: RateLimitListQueryDto,
      response: {
        200: ResWrapper(RateLimitListResDto),
        ...authErrors,
      },
    },
  )
  .use(authorize(has('RATE_LIMIT.MANAGE')))
  .post(
    '/block',
    async ({ body }) => {
      await rateLimitService.block({
        identifier: body.identifier,
        type: body.type,
        blockedUntil: body.blockedUntil,
      });
      return castToRes({ success: true });
    },
    {
      body: BlockRateLimitDto,
      response: {
        200: ResWrapper(t.Object({ success: t.Boolean() })),
        ...authErrors,
      },
    },
  )
  .post(
    '/unblock',
    async ({ body }) => {
      await rateLimitService.unblock({
        identifier: body.identifier,
        type: body.type,
      });
      return castToRes({ success: true });
    },
    {
      body: UnblockRateLimitDto,
      response: {
        200: ResWrapper(t.Object({ success: t.Boolean() })),
        ...authErrors,
      },
    },
  )
  .post(
    '/cleanup',
    async () => {
      const count = await rateLimitService.cleanupExpiredWindows();
      return castToRes({ count });
    },
    {
      response: {
        200: ResWrapper(t.Object({ count: t.Number() })),
        ...authErrors,
      },
    },
  );
