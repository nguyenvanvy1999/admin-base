import { t } from 'elysia';
import { SecurityEventSeverity, SecurityEventType } from 'src/generated';
import { PaginatedDto, PaginationReqDto } from 'src/share';

export const SecurityEventListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    userId: t.Optional(t.String()),
    eventType: t.Optional(t.Enum(SecurityEventType)),
    severity: t.Optional(t.Enum(SecurityEventSeverity)),
    resolved: t.Optional(t.Boolean()),
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

export const SecurityEventItemDto = t.Object({
  id: t.String(),
  userId: t.Nullable(t.String()),
  eventType: t.Enum(SecurityEventType),
  severity: t.Enum(SecurityEventSeverity),
  ip: t.Nullable(t.String()),
  userAgent: t.Nullable(t.String()),
  location: t.Nullable(t.Any()),
  metadata: t.Nullable(t.Any()),
  resolved: t.Boolean(),
  resolvedAt: t.Nullable(t.Date({ format: 'date-time' })),
  resolvedBy: t.Nullable(t.String()),
  created: t.Date({ format: 'date-time' }),
  description: t.String(),
});

export const SecurityEventListResDto = PaginatedDto(SecurityEventItemDto);

export const ResolveSecurityEventDto = t.Object({
  id: t.String(),
});
