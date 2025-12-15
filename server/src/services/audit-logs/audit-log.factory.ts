import type {
  AuditLogCategory,
  AuditLogVisibility,
  LogType,
} from 'src/generated';
import type { ACTIVITY_TYPE } from 'src/services/shared/constants';
import { inferSeverityFromEventType } from 'src/services/shared/utils';
import { ctxStore, IdUtil, LOG_LEVEL } from 'src/share';
import {
  extractEntityIdFromPayload,
  inferEntityTypeFromActivityType,
  isCudPayload,
} from './audit-log.helpers';
import { AUDIT_EVENT_DEFINITIONS } from './definitions';
import type {
  AuditEventInput,
  AuditEventRegistry,
  AuditLogFactoryResult,
  NormalizedAuditPayload,
} from './types';

type FactoryDependencies = {
  registry: AuditEventRegistry;
};

const defaultSerializer = <T extends AuditEventInput<ACTIVITY_TYPE>>({
  payload,
  entry: _entry,
  description,
  entity,
  actorId,
  subjectUserId,
}: {
  payload: T['payload'];
  entry: T;
  description?: string | null;
  entity?: { type?: string | null; id?: string | null };
  actorId?: string | null;
  subjectUserId?: string | null;
}): NormalizedAuditPayload => {
  const normalized: NormalizedAuditPayload = {
    description: description ?? null,
    entity,
    actor: { userId: actorId ?? null },
    subject: { userId: subjectUserId ?? null },
    raw: payload as Record<string, unknown>,
  };

  if (isCudPayload(payload)) {
    normalized.changes = payload.changes;
  }

  if ((payload as { metadata?: unknown }).metadata) {
    normalized.meta = (
      payload as { metadata?: Record<string, unknown> }
    ).metadata;
  }

  if ((payload as { location?: unknown }).location) {
    normalized.location = (
      payload as { location?: Record<string, unknown> }
    ).location;
  }

  return normalized;
};

export class AuditLogFactory {
  constructor(
    private readonly deps: FactoryDependencies = {
      registry: AUDIT_EVENT_DEFINITIONS,
    },
  ) {}

  create<T extends ACTIVITY_TYPE>(
    entry: AuditEventInput<T>,
  ): AuditLogFactoryResult<T> {
    const ctx = ctxStore.getStore();
    const logId = IdUtil.snowflakeId().toString().padStart(20, '0');
    const definition = this.deps.registry[entry.type];

    const maskedPayload = definition?.mask?.(entry.payload) ?? entry.payload;
    const eventPayload = maskedPayload as AuditEventInput<T>['payload'];

    const actorId = entry.userId ?? ctx?.userId ?? null;

    const resolvedSubject =
      entry.subjectUserId ??
      definition?.getSubjectUserId?.(eventPayload) ??
      (isCudPayload(eventPayload) ? eventPayload.entityId : null) ??
      actorId;

    const resolvedEntity =
      definition?.resolveEntity?.(eventPayload) ??
      (isCudPayload(eventPayload)
        ? {
            type: eventPayload.entityType ?? entry.entityType ?? null,
            id: eventPayload.entityId ?? entry.entityId ?? null,
          }
        : {
            type:
              entry.entityType ??
              inferEntityTypeFromActivityType(entry.type, eventPayload),
            id:
              entry.entityId ??
              extractEntityIdFromPayload(entry.type, eventPayload),
          });

    const description =
      entry.description ??
      definition?.describe?.({ payload: eventPayload, entry }) ??
      null;

    const severity =
      entry.severity ??
      (entry.eventType
        ? inferSeverityFromEventType(entry.eventType)
        : definition?.defaultSeverity);

    const logType: LogType =
      entry.logType ??
      definition?.logType ??
      (entry.eventType ? 'security' : 'audit');

    const category: AuditLogCategory =
      (entry.category as AuditLogCategory) ??
      definition?.category ??
      (isCudPayload(maskedPayload) ? 'cud' : 'security');

    const visibility: AuditLogVisibility =
      entry.visibility ?? definition?.visibility ?? 'actor_only';

    const payload =
      definition?.serialize?.({
        payload: eventPayload,
        entry,
        description,
        entity: resolvedEntity,
        actorId,
        subjectUserId: resolvedSubject,
      }) ??
      defaultSerializer({
        payload: eventPayload,
        entry,
        description,
        entity: resolvedEntity,
        actorId,
        subjectUserId: resolvedSubject,
      });

    const entityDisplay =
      entry.entityDisplay ??
      (resolvedEntity?.type || resolvedEntity?.id
        ? {
            type: resolvedEntity?.type ?? undefined,
            id: resolvedEntity?.id ?? undefined,
          }
        : null);

    return {
      logId,
      entry: {
        ...entry,
        payload,
        description,
        category,
        visibility,
        subjectUserId: resolvedSubject,
        entityType: entry.entityType ?? resolvedEntity?.type,
        entityId: entry.entityId ?? resolvedEntity?.id,
        entityDisplay,
        logId,
        logType,
        level: entry.level ?? LOG_LEVEL.INFO,
        userId: actorId,
        sessionId: entry.sessionId ?? ctx?.sessionId,
        timestamp: entry.timestamp ?? new Date(),
        ip: entry.ip ?? ctx?.clientIp,
        userAgent: entry.userAgent ?? ctx?.userAgent,
        requestId: entry.requestId ?? ctx?.id,
        severity,
        resolved: entry.resolved ?? false,
        resolvedAt: entry.resolvedAt,
        resolvedBy: entry.resolvedBy ?? ctx?.userId,
        traceId: entry.traceId,
        correlationId: entry.correlationId,
      },
    };
  }
}
