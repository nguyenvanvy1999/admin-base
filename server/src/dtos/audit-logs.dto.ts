import { t } from 'elysia';
import {
  AuditLogCategory,
  AuditLogVisibility,
  LogType,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/generated';
import {
  DateRangeOccurredAtDto,
  LOG_LEVEL,
  PaginatedDto,
  PaginationReqDto,
  type WithPermissionContext,
} from 'src/share';

export const AuditLogListQueryDto = t.Intersect([
  PaginationReqDto,
  DateRangeOccurredAtDto,
  t.Object({
    userId: t.Optional(t.String()),
    sessionId: t.Optional(t.String()),
    entityType: t.Optional(t.String()),
    entityId: t.Optional(t.String()),
    level: t.Optional(t.Enum(LOG_LEVEL)),
    logType: t.Optional(t.Enum(LogType)),
    eventType: t.Optional(t.Enum(SecurityEventType)),
    severity: t.Optional(t.Enum(SecurityEventSeverity)),
    resolved: t.Optional(t.Boolean()),
    ip: t.Optional(t.String()),
    traceId: t.Optional(t.String()),
    correlationId: t.Optional(t.String()),
    subjectUserId: t.Optional(t.String()),
    category: t.Optional(t.Enum(AuditLogCategory)),
    visibility: t.Optional(t.Enum(AuditLogVisibility)),
  }),
]);

export const AuditLogItemDto = t.Object({
  id: t.String(),
  payload: t.Any(),
  description: t.Nullable(t.String()),
  level: t.String(),
  logType: t.Enum(LogType),
  category: t.Nullable(t.Enum(AuditLogCategory)),
  visibility: t.Enum(AuditLogVisibility),
  eventType: t.Nullable(t.Enum(SecurityEventType)),
  severity: t.Nullable(t.Enum(SecurityEventSeverity)),
  userId: t.Nullable(t.String()),
  subjectUserId: t.Nullable(t.String()),
  sessionId: t.Nullable(t.String()),
  entityType: t.Nullable(t.String()),
  entityId: t.Nullable(t.String()),
  entityDisplay: t.Nullable(t.Any()),
  ip: t.Nullable(t.String()),
  userAgent: t.Nullable(t.String()),
  requestId: t.Nullable(t.String()),
  traceId: t.Nullable(t.String()),
  correlationId: t.Nullable(t.String()),
  resolved: t.Boolean(),
  resolvedAt: t.Nullable(t.Date({ format: 'date-time' })),
  resolvedBy: t.Nullable(t.String()),
  occurredAt: t.Date({ format: 'date-time' }),
  created: t.Date({ format: 'date-time' }),
});

export const AuditLogListResDto = PaginatedDto(AuditLogItemDto);

export type AuditLogListParams = WithPermissionContext<
  typeof AuditLogListQueryDto.static
>;

export type AuditLogListRes = typeof AuditLogListResDto.static;
