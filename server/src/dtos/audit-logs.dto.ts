import { t } from 'elysia';
import {
  AuditLogCategory,
  AuditLogVisibility,
  LogType,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/generated';
import { LOG_LEVEL, PaginatedDto, PaginationReqDto } from 'src/share';

export const AuditLogListQueryDto = t.Object({
  take: PaginationReqDto.properties.take,
  skip: PaginationReqDto.properties.skip,
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
});

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

export type AuditLogListParams = typeof AuditLogListQueryDto.static & {
  currentUserId: string;
  hasViewPermission: boolean;
};

export type AuditLogListRes = typeof AuditLogListResDto.static;
