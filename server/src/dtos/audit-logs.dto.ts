import { t } from 'elysia';
import { PaginatedDto, PaginationReqDto } from 'src/share';

export const AuditLogListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    userId: t.Optional(t.String()),
    sessionId: t.Optional(t.String()),
    entityType: t.Optional(t.String()),
    entityId: t.Optional(t.String()),
    level: t.Optional(t.String()),
    logType: t.Optional(t.String()),
    ip: t.Optional(t.String()),
    traceId: t.Optional(t.String()),
    correlationId: t.Optional(t.String()),
    occurredAt0: t.Optional(
      t.Date({
        format: 'date-time',
        example: '2023-10-01T00:00:00.000Z',
      }),
    ),
    occurredAt1: t.Optional(
      t.Date({
        format: 'date-time',
        example: '2023-10-10T23:59:59.999Z',
      }),
    ),
  }),
]);

export const AuditLogItemDto = t.Object({
  id: t.String(),
  payload: t.Any(),
  level: t.String(),
  logType: t.String(),
  userId: t.Nullable(t.String()),
  sessionId: t.Nullable(t.String()),
  entityType: t.Nullable(t.String()),
  entityId: t.Nullable(t.String()),
  description: t.Nullable(t.String()),
  ip: t.Nullable(t.String()),
  userAgent: t.Nullable(t.String()),
  requestId: t.Nullable(t.String()),
  traceId: t.Nullable(t.String()),
  correlationId: t.Nullable(t.String()),
  occurredAt: t.Date({ format: 'date-time' }),
  created: t.Date({ format: 'date-time' }),
});

export const AuditLogListResDto = PaginatedDto(AuditLogItemDto);

export type AuditLogListParams = typeof AuditLogListQueryDto.static & {
  currentUserId: string;
  hasViewPermission: boolean;
};
