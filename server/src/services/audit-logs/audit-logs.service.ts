import { db } from 'src/config/db';
import { auditLogQueue } from 'src/config/queue';
import type {
  AuditLogListParams,
  AuditLogListRes,
} from 'src/dtos/audit-logs.dto';
import type { AuditLogWhereInput } from 'src/generated';
import {
  AuditLogCategory,
  AuditLogVisibility,
  LogLevel,
  LogType,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/generated';
import { executeListQuery } from 'src/services/shared/utils/list-query.util';
import { IdUtil, LOG_LEVEL } from 'src/share';
import { ctxStore, getIpAndUa } from 'src/share/context/request-context';
import type { EnrichedAuditLogEntry } from 'src/share/type';
import type { EntityType } from './types';
import type {
  CudCreatePayload,
  CudDeletePayload,
  CudUpdatePayload,
} from './types/cud-types';
import type {
  InternalEventPayload,
  InternalEventType,
} from './types/internal-types';
import type { SecurityEventPayloadBase } from './types/security-types';

export class AuditLogsService {
  async pushCud<
    TEntityType extends EntityType,
    TAction extends 'create' | 'update' | 'delete',
  >(
    payload: TAction extends 'create'
      ? CudCreatePayload<TEntityType>
      : TAction extends 'update'
        ? CudUpdatePayload<TEntityType>
        : CudDeletePayload<TEntityType>,
    options?: {
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
      entityDisplay?: Record<string, unknown>;
    },
  ): Promise<void> {
    const context = this.getContext();
    const enrichedEntry = this.enrichCudEntry(payload, context, options);

    await auditLogQueue.add(
      `cud-${payload.entityType}-${payload.action}`,
      enrichedEntry,
      {
        jobId: enrichedEntry.logId,
      },
    );
  }

  async pushSecurity<TEventType extends SecurityEventType>(
    payload: SecurityEventPayloadBase<TEventType>,
    options?: {
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
      resolved?: boolean;
    },
  ): Promise<void> {
    const context = this.getContext();
    const enrichedEntry = this.enrichSecurityEntry(payload, context, options);

    await auditLogQueue.add(`security-${payload.eventType}`, enrichedEntry, {
      jobId: enrichedEntry.logId,
    });
  }

  async pushOther<TEventType extends InternalEventType>(
    payload: InternalEventPayload<TEventType>,
    options?: {
      logType?: LogType;
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
    },
  ): Promise<void> {
    const context = this.getContext();
    const enrichedEntry = this.enrichOtherEntry(payload, context, options);

    await auditLogQueue.add(`other-${payload.eventType}`, enrichedEntry, {
      jobId: enrichedEntry.logId,
    });
  }

  async pushBatch(
    entries: Array<
      | {
          type: 'cud';
          payload:
            | CudCreatePayload<EntityType>
            | CudUpdatePayload<EntityType>
            | CudDeletePayload<EntityType>;
        }
      | {
          type: 'security';
          payload: SecurityEventPayloadBase<SecurityEventType>;
        }
      | { type: 'other'; payload: InternalEventPayload<InternalEventType> }
    >,
  ): Promise<void> {
    const context = this.getContext();

    const enrichedEntries = entries.map((entry) => {
      if (entry.type === 'cud') {
        return this.enrichCudEntry(entry.payload, context);
      } else if (entry.type === 'security') {
        return this.enrichSecurityEntry(entry.payload, context);
      } else {
        return this.enrichOtherEntry(entry.payload, context);
      }
    });

    await Promise.all(
      enrichedEntries.map((entry) =>
        auditLogQueue.add(`${entry.type}-${entry.logId}`, entry, {
          jobId: entry.logId,
        }),
      ),
    );
  }

  async list(params: AuditLogListParams): Promise<AuditLogListRes> {
    const {
      currentUserId,
      hasViewPermission,
      skip,
      take,
      userId,
      sessionId,
      entityType,
      entityId,
      level,
      logType,
      eventType,
      severity,
      resolved,
      ip,
      traceId,
      correlationId,
      subjectUserId,
      category,
      visibility,
      occurredAt0,
      occurredAt1,
    } = params;

    const where: AuditLogWhereInput = {
      ...(userId && { userId }),
      ...(sessionId && { sessionId }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(level && { level }),
      ...(logType && { logType }),
      ...(eventType && { eventType }),
      ...(severity && { severity }),
      ...(resolved !== undefined && { resolved }),
      ...(ip && { ip }),
      ...(traceId && { traceId }),
      ...(correlationId && { correlationId }),
      ...(subjectUserId && { subjectUserId }),
      ...(category && { category }),
      ...(visibility && { visibility }),
      ...(occurredAt0 &&
        occurredAt1 && {
          occurredAt: {
            gte: occurredAt0,
            lte: occurredAt1,
          },
        }),
    };

    if (hasViewPermission) {
      where.OR = [
        { visibility: 'public' },
        { visibility: 'admin_only' },
        { visibility: 'actor_only', userId: currentUserId },
        { visibility: 'subject_only', subjectUserId: currentUserId },
        {
          visibility: 'actor_and_subject',
          OR: [{ userId: currentUserId }, { subjectUserId: currentUserId }],
        },
      ];
    } else {
      where.OR = [
        { visibility: 'public' },
        { visibility: 'actor_only', userId: currentUserId },
        { visibility: 'subject_only', subjectUserId: currentUserId },
        {
          visibility: 'actor_and_subject',
          OR: [{ userId: currentUserId }, { subjectUserId: currentUserId }],
        },
      ];
    }

    const result = await executeListQuery(db.auditLog, {
      where,
      orderBy: { occurredAt: 'desc' },
      take,
      skip,
    });

    return {
      docs: result.docs.map((doc) => ({
        ...doc,
        id: doc.id.toString(),
      })),
      count: result.count,
    };
  }

  private getContext() {
    const store = ctxStore.getStore();
    let ip: string | null = null;
    let userAgent: string | null = null;

    try {
      const ipAndUa = getIpAndUa();
      ip = ipAndUa.clientIp;
      userAgent = ipAndUa.userAgent;
    } catch {
      ip = null;
      userAgent = null;
    }

    return {
      userId: store?.userId ?? null,
      sessionId: store?.sessionId ?? null,
      ip,
      userAgent,
      requestId: store?.id ?? null,
      traceId: store?.id ?? null,
      correlationId: store?.id ?? null,
      timestamp: new Date(),
    };
  }

  private enrichCudEntry(
    payload:
      | CudCreatePayload<EntityType>
      | CudUpdatePayload<EntityType>
      | CudDeletePayload<EntityType>,
    context: ReturnType<typeof this.getContext>,
    options?: {
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
      entityDisplay?: Record<string, unknown>;
    },
  ): EnrichedAuditLogEntry {
    const logId = IdUtil.snowflakeId().toString();
    const description = this.generateCudDescription(payload);

    const visibility =
      options?.visibility ?? this.getDefaultCudVisibility(payload);

    return {
      logId,
      type: `cud-${payload.entityType}-${payload.action}` as const,
      logType: LogType.audit,
      level: LOG_LEVEL.INFO,
      category: AuditLogCategory.cud,
      visibility,
      userId: context.userId,
      sessionId: context.sessionId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityDisplay: options?.entityDisplay ?? payload.entityDisplay ?? null,
      subjectUserId: options?.subjectUserId ?? null,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
      traceId: context.traceId,
      correlationId: context.correlationId,
      payload: payload as Record<string, unknown>,
      description,
      timestamp: context.timestamp,
    };
  }

  private enrichSecurityEntry(
    payload: SecurityEventPayloadBase<SecurityEventType>,
    context: ReturnType<typeof this.getContext>,
    options?: {
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
      resolved?: boolean;
    },
  ): EnrichedAuditLogEntry {
    const logId = IdUtil.snowflakeId().toString();
    const description = this.generateSecurityDescription(payload);

    const visibility =
      options?.visibility ?? this.getDefaultSecurityVisibility(payload);

    return {
      logId,
      type: `security-${payload.eventType}` as const,
      logType: LogType.security,
      level: this.mapSeverityToLogLevel(payload.severity),
      category: AuditLogCategory.security,
      visibility,
      eventType: payload.eventType,
      severity: payload.severity,
      userId: context.userId,
      sessionId: context.sessionId,
      subjectUserId: options?.subjectUserId ?? context.userId ?? null,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
      traceId: context.traceId,
      correlationId: context.correlationId,
      payload: {
        ...payload,
        location: payload.location,
        metadata: payload.metadata,
      },
      description,
      resolved: options?.resolved ?? false,
      timestamp: context.timestamp,
    };
  }

  private enrichOtherEntry(
    payload: InternalEventPayload<InternalEventType>,
    context: ReturnType<typeof this.getContext>,
    options?: {
      logType?: LogType;
      visibility?: AuditLogVisibility;
      subjectUserId?: string;
    },
  ): EnrichedAuditLogEntry {
    const logId = IdUtil.snowflakeId().toString();
    const description = this.generateOtherDescription(payload);

    return {
      logId,
      type: `other-${payload.eventType}` as const,
      logType: options?.logType ?? this.getDefaultLogType(payload.eventType),
      level: this.mapLogLevelToLogLevel(payload.level),
      category: payload.category as AuditLogCategory,
      visibility: options?.visibility ?? AuditLogVisibility.admin_only,
      userId: context.userId,
      sessionId: context.sessionId,
      subjectUserId: options?.subjectUserId ?? null,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
      traceId: context.traceId,
      correlationId: context.correlationId,
      payload: payload as Record<string, unknown>,
      description,
      timestamp: context.timestamp,
    };
  }

  private getDefaultCudVisibility(
    payload:
      | CudCreatePayload<EntityType>
      | CudUpdatePayload<EntityType>
      | CudDeletePayload<EntityType>,
  ): AuditLogVisibility {
    if (payload.entityType === 'user') {
      return AuditLogVisibility.actor_and_subject;
    }
    if (payload.entityType === 'role' || payload.entityType === 'setting') {
      return AuditLogVisibility.admin_only;
    }
    return AuditLogVisibility.actor_only;
  }

  private getDefaultSecurityVisibility(
    payload: SecurityEventPayloadBase<SecurityEventType>,
  ): AuditLogVisibility {
    const userVisibleEvents: SecurityEventType[] = [
      SecurityEventType.login_success,
      SecurityEventType.login_failed,
      SecurityEventType.password_changed,
      SecurityEventType.mfa_enabled,
      SecurityEventType.mfa_disabled,
    ];

    if (userVisibleEvents.includes(payload.eventType)) {
      return AuditLogVisibility.actor_and_subject;
    }

    return AuditLogVisibility.admin_only;
  }

  private mapSeverityToLogLevel(severity: SecurityEventSeverity): LOG_LEVEL {
    const map: Record<SecurityEventSeverity, LOG_LEVEL> = {
      [SecurityEventSeverity.low]: LOG_LEVEL.INFO,
      [SecurityEventSeverity.medium]: LOG_LEVEL.WARNING,
      [SecurityEventSeverity.high]: LOG_LEVEL.ERROR,
      [SecurityEventSeverity.critical]: LOG_LEVEL.FATAL,
    };
    return map[severity];
  }

  private mapLogLevelToLogLevel(level: LogLevel): LOG_LEVEL {
    const map: Record<LogLevel, LOG_LEVEL> = {
      [LogLevel.info]: LOG_LEVEL.INFO,
      [LogLevel.warn]: LOG_LEVEL.WARNING,
      [LogLevel.error]: LOG_LEVEL.ERROR,
      [LogLevel.critical]: LOG_LEVEL.FATAL,
    };
    return map[level];
  }

  private getDefaultLogType(eventType: InternalEventType): LogType {
    if (eventType === 'rate_limit') return LogType.rate_limit;
    if (eventType === 'api_event') return LogType.api;
    if (eventType === 'system_event') return LogType.system;
    return LogType.audit;
  }

  private generateCudDescription(
    payload:
      | CudCreatePayload<EntityType>
      | CudUpdatePayload<EntityType>
      | CudDeletePayload<EntityType>,
  ): string {
    const { entityType, entityId, action } = payload;

    if (action === 'create') {
      return `${entityType} created: ${entityId}`;
    }
    if (action === 'update') {
      const changeKeys = Object.keys(payload.changes ?? {});
      return `${entityType} updated: ${entityId} [${changeKeys.join(', ')}]`;
    }
    return `${entityType} deleted: ${entityId}`;
  }

  private generateSecurityDescription(
    payload: SecurityEventPayloadBase<SecurityEventType>,
  ): string {
    return `Security event: ${payload.eventType}`;
  }

  private generateOtherDescription(
    payload: InternalEventPayload<InternalEventType>,
  ): string {
    return `Internal event: ${payload.eventType}`;
  }
}

export const auditLogsService = new AuditLogsService();
