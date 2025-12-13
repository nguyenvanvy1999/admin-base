import { Elysia, t } from 'elysia';
import {
  CreateRateLimitConfigDto,
  RateLimitConfigItemDto,
  RateLimitConfigListQueryDto,
  RateLimitConfigListResDto,
  UpdateRateLimitConfigDto,
} from 'src/dtos/rate-limit-config.dto';
import { authorize, has } from 'src/service/auth/authorization';
import { authCheck } from 'src/service/auth/middleware';
import { rateLimitConfigService } from 'src/service/rate-limit/rate-limit-config.service';
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
      const result = await rateLimitConfigService.list({
        ...query,
        skip: query.skip,
        take: query.take,
      });
      return castToRes(result);
    },
    {
      query: RateLimitConfigListQueryDto,
      response: {
        200: ResWrapper(RateLimitConfigListResDto),
        ...authErrors,
      },
    },
  )
  .use(authorize(has('RATE_LIMIT.MANAGE')))
  .post(
    '/',
    async ({ body }) => {
      const config = await rateLimitConfigService.create(body);
      return castToRes(config);
    },
    {
      body: CreateRateLimitConfigDto,
      response: {
        200: ResWrapper(RateLimitConfigItemDto),
        ...authErrors,
      },
    },
  )
  .post(
    '/:id',
    async ({ body, params }) => {
      const config = await rateLimitConfigService.update(params.id, body);
      return castToRes(config);
    },
    {
      body: UpdateRateLimitConfigDto,
      params: t.Object({ id: t.String() }),
      response: {
        200: ResWrapper(RateLimitConfigItemDto),
        ...authErrors,
      },
    },
  )
  .delete(
    '/:id',
    async ({ params }) => {
      await rateLimitConfigService.delete(params.id);
      return castToRes({ success: true });
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: ResWrapper(t.Object({ success: t.Boolean() })),
        ...authErrors,
      },
    },
  );
