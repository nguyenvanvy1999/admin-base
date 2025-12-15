import { db, type IDb } from 'src/config/db';
import { auditLogQueue, type IAuditLogQueue } from 'src/config/queue';
import type { AuditLogListParams } from 'src/dtos/audit-logs.dto';
import {
  type AuditLogWhereInput,
  LogType,
  type SecurityEventSeverity,
  type SecurityEventType,
} from 'src/generated';
import { executeListQuery } from 'src/services/shared/utils';
import {
  ACTIVITY_TYPE,
  type AuditLogEntry,
  BadReqErr,
  ctxStore,
  ErrCode,
  extractEntityIdFromPayload,
  generateAuditLogDescription,
  getIpAndUa,
  getSecurityEventDescription,
  IdUtil,
  inferEntityTypeFromActivityType,
  inferSeverityFromEventType,
  LOG_LEVEL,
  type PrismaTx,
} from 'src/share';

const JOB_NAME = 'audit-log';

type CreateSecurityEventParams = {
  userId?: string;
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  ip?: string;
  userAgent?: string;
  location?: Record<string, any>;
  metadata?: Record<string, any>;
};

type ResolveAuditLogParams = {
  id: string;
  resolvedBy?: string;
  tx?: PrismaTx;
};

export class AuditLogsService {
  constructor(
    private readonly deps: {
      db: IDb;
      queue: IAuditLogQueue;
    } = {
      db,
      queue: auditLogQueue,
    },
  ) {}

  mapData(entry: AuditLogEntry) {
    const logId = IdUtil.snowflakeId().toString().padStart(20, '0');
    const ctx = ctxStore.getStore();

    const pickValue = <T>(value: T | undefined | null, fallback?: T) =>
      value !== undefined ? value : fallback;

    const resolvedBy = entry.resolvedBy ?? ctx?.userId ?? undefined;
    const severity: SecurityEventSeverity | undefined =
      entry.severity ??
      (entry.eventType
        ? inferSeverityFromEventType(entry.eventType)
        : undefined);
    const logType: LogType =
      entry.logType ?? (entry.eventType ? LogType.security : LogType.audit);
    const entityType =
      entry.entityType ?? inferEntityTypeFromActivityType(entry.type);
    const entityId =
      entry.entityId ?? extractEntityIdFromPayload(entry.type, entry.payload);
    const description =
      entry.description ??
      (entry.eventType
        ? getSecurityEventDescription(entry.eventType, entry.payload)
        : generateAuditLogDescription(entry.type, entry.payload));

    const enrichedEntry: AuditLogEntry & {
      logId: string;
      timestamp: Date;
    } = {
      ...entry,
      logId: logId,
      logType,
      eventType: entry.eventType,
      severity,
      resolved: entry.resolved ?? false,
      resolvedAt: entry.resolvedAt,
      resolvedBy,
      level: entry.level ?? LOG_LEVEL.INFO,
      timestamp: entry.timestamp ?? new Date(),
      userId: pickValue(entry.userId, ctx?.userId),
      sessionId: pickValue(entry.sessionId, ctx?.sessionId),
      entityType,
      entityId,
      description,
      ip: pickValue(entry.ip, ctx?.clientIp),
      userAgent: pickValue(entry.userAgent, ctx?.userAgent),
      requestId: pickValue(entry.requestId, ctx?.id),
      traceId: entry.traceId,
      correlationId: entry.correlationId,
    };

    return { enrichedEntry, logId };
  }

  logSecurityEvent(params: CreateSecurityEventParams): Promise<string> {
    const { userId, eventType, severity, ip, userAgent, location, metadata } =
      params;

    const { clientIp, userAgent: ctxUserAgent } = getIpAndUa();
    const finalIp = ip ?? clientIp;
    const finalUserAgent = userAgent ?? ctxUserAgent;
    const finalSeverity = severity ?? inferSeverityFromEventType(eventType);

    return this.push({
      logType: LogType.security,
      type: ACTIVITY_TYPE.INTERNAL_ERROR as AuditLogEntry['type'],
      payload: { ...(metadata ?? {}), location },
      eventType,
      severity: finalSeverity,
      description: getSecurityEventDescription(eventType, metadata),
      userId,
      ip: finalIp,
      userAgent: finalUserAgent,
      resolved: false,
      level: LOG_LEVEL.WARNING,
    });
  }

  async push<T extends ACTIVITY_TYPE>(
    entry: Omit<AuditLogEntry<T>, 'ip' | 'userAgent' | 'requestId'>,
  ): Promise<string> {
    const { enrichedEntry, logId } = this.mapData(entry);

    await this.deps.queue.add(JOB_NAME, enrichedEntry, {
      jobId: logId,
    });

    return logId;
  }

  async pushBatch<T extends ACTIVITY_TYPE>(
    entries: Omit<AuditLogEntry<T>, 'ip' | 'userAgent' | 'requestId'>[],
  ): Promise<string[]> {
    if (entries.length === 0) return [];

    const jobIds: string[] = [];
    const enrichedEntries: { name: string; data: AuditLogEntry }[] = [];

    for (const entry of entries) {
      const { enrichedEntry, logId } = this.mapData(entry);
      jobIds.push(logId);
      enrichedEntries.push({ name: JOB_NAME, data: enrichedEntry });
    }

    await this.deps.queue.addBulk(enrichedEntries);

    return jobIds;
  }

  resolve(params: ResolveAuditLogParams) {
    const { id, resolvedBy, tx } = params;
    const dbInstance = tx || this.deps.db;

    return dbInstance.auditLog.update({
      where: { id: BigInt(id) },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
      select: {
        id: true,
        resolved: true,
        resolvedAt: true,
        resolvedBy: true,
      },
    });
  }

  async list(params: AuditLogListParams) {
    const {
      take,
      skip,
      userId,
      sessionId,
      entityType,
      entityId,
      eventType,
      severity,
      resolved,
      level,
      logType,
      ip,
      traceId,
      correlationId,
      occurredAt0,
      occurredAt1,
      currentUserId,
      hasViewPermission,
    } = params;

    const conditions: AuditLogWhereInput[] = [];

    if (userId) {
      if (!hasViewPermission && userId !== currentUserId) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }
      conditions.push({ userId });
    } else if (!hasViewPermission) {
      conditions.push({ userId: currentUserId });
    }

    if (sessionId) {
      conditions.push({ sessionId });
    }

    if (entityType) {
      conditions.push({ entityType });
    }

    if (entityId) {
      conditions.push({ entityId });
    }

    if (eventType) {
      conditions.push({ eventType });
    }

    if (severity) {
      conditions.push({ severity });
    }

    if (resolved !== undefined) {
      conditions.push({ resolved });
    }

    if (level) {
      conditions.push({ level: level });
    }

    if (logType) {
      conditions.push({ logType: logType });
    }

    if (ip) {
      conditions.push({ ip });
    }

    if (traceId) {
      conditions.push({ traceId });
    }

    if (correlationId) {
      conditions.push({ correlationId });
    }

    if (occurredAt0 || occurredAt1) {
      const dateCondition: AuditLogWhereInput['occurredAt'] = {};
      if (occurredAt0) {
        dateCondition.gte = new Date(occurredAt0);
      }
      if (occurredAt1) {
        dateCondition.lte = new Date(occurredAt1);
      }
      conditions.push({ occurredAt: dateCondition });
    }

    const where = conditions.length > 0 ? { AND: conditions } : undefined;

    const { docs, count } = await executeListQuery(this.deps.db.auditLog, {
      where,
      select: {
        id: true,
        payload: true,
        level: true,
        logType: true,
        eventType: true,
        severity: true,
        userId: true,
        sessionId: true,
        entityType: true,
        entityId: true,
        description: true,
        ip: true,
        userAgent: true,
        requestId: true,
        traceId: true,
        correlationId: true,
        resolved: true,
        resolvedAt: true,
        resolvedBy: true,
        occurredAt: true,
        created: true,
      },
      take,
      skip,
      orderBy: { occurredAt: 'desc' },
    });

    const formattedDocs = docs.map((doc) => ({
      ...doc,
      id: doc.id.toString(),
    }));

    return {
      docs: formattedDocs,
      count,
    };
  }
}

export const auditLogsService = new AuditLogsService();
