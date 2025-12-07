import { t } from 'elysia';
import { RateLimitType } from 'src/generated';
import { PaginatedDto, PaginationReqDto } from 'src/share';

export const RateLimitListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    identifier: t.Optional(t.String()),
    type: t.Optional(t.Enum(RateLimitType)),
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
  type: t.Enum(RateLimitType),
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
  type: t.Enum(RateLimitType),
  blockedUntil: t.Optional(t.Date({ format: 'date-time' })),
});

export const UnblockRateLimitDto = t.Object({
  identifier: t.String(),
  type: t.Enum(RateLimitType),
});
