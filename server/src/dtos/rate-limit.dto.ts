import { t } from 'elysia';
import { PaginatedDto, PaginationReqDto } from 'src/share';

export const RateLimitListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    identifier: t.Optional(t.String()),
    routePath: t.Optional(t.String()),
    blocked: t.Optional(t.Boolean()),
    created0: t.Optional(
      t.Date({
        format: 'date-time',
        example: '2023-10-01T00:00:00.000Z',
      }),
    ),
    created1: t.Optional(
      t.Date({
        format: 'date-time',
        example: '2023-10-10T23:59:59.999Z',
      }),
    ),
  }),
]);

export const RateLimitItemDto = t.Object({
  id: t.String(),
  identifier: t.String(),
  routePath: t.String(),
  count: t.Number(),
  limit: t.Number(),
  windowStart: t.Date({ format: 'date-time' }),
  windowEnd: t.Date({ format: 'date-time' }),
  blocked: t.Boolean(),
  blockedUntil: t.Nullable(t.Date({ format: 'date-time' })),
  created: t.Date({ format: 'date-time' }),
  modified: t.Date({ format: 'date-time' }),
});

export const RateLimitListResDto = PaginatedDto(RateLimitItemDto);

export const BlockRateLimitDto = t.Object({
  identifier: t.String(),
  routePath: t.String(),
  blockedUntil: t.Optional(t.Date({ format: 'date-time' })),
});

export const UnblockRateLimitDto = t.Object({
  identifier: t.String(),
  routePath: t.String(),
});
