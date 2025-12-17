import { t } from 'elysia';
import { RateLimitStrategy } from 'src/generated';
import { PaginatedDto, PaginationReqDto } from 'src/share';

export const RateLimitConfigListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    routePath: t.Optional(t.String()),
    enabled: t.Optional(t.Boolean()),
  }),
]);

export const RateLimitConfigItemDto = t.Object({
  id: t.String(),
  routePath: t.String(),
  limit: t.Number({ minimum: 1 }),
  windowSeconds: t.Number({ minimum: 1 }),
  strategy: t.Enum(RateLimitStrategy),
  enabled: t.Boolean(),
  description: t.Nullable(t.String()),
  created: t.Date({ format: 'date-time' }),
  modified: t.Date({ format: 'date-time' }),
});

export const RateLimitConfigListResDto = PaginatedDto(RateLimitConfigItemDto);

export const UpsertRateLimitConfigDto = t.Object({
  id: t.Optional(t.String({ minLength: 1 })),
  routePath: t.String(),
  limit: t.Number({ minimum: 1 }),
  windowSeconds: t.Number({ minimum: 1 }),
  strategy: t.Enum(RateLimitStrategy),
  enabled: t.Optional(t.Boolean()),
  description: t.Optional(t.String()),
});
export type IUpsertRateLimitConfig = typeof UpsertRateLimitConfigDto.static;
