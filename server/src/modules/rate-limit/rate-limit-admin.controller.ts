import { Elysia, t } from 'elysia';
import {
  RateLimitConfigListQueryDto,
  RateLimitConfigListResDto,
  UpsertRateLimitConfigDto,
} from 'src/dtos/rate-limit-config.dto';
import { authCheck, authorize, has } from 'src/services/auth';
import { rateLimitConfigService } from 'src/services/rate-limit/rate-limit-config.service';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const rateLimitAdminController = new Elysia({
  prefix: '/admin/rate-limits',
  tags: [DOC_TAG.ADMIN_RATE_LIMIT],
  detail: { security: ACCESS_AUTH },
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
  .use(authorize(has('RATE_LIMIT.UPDATE')))
  .post(
    '/',
    async ({ body }) => {
      await rateLimitConfigService.upsert(body);
      return castToRes(null);
    },
    {
      body: UpsertRateLimitConfigDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .post(
    '/del',
    async ({ body }) => {
      await rateLimitConfigService.deleteMany(body.ids);
      return castToRes(null);
    },
    {
      body: IdsDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
