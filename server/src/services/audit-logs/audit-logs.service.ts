import { db, type IDb } from 'src/config/db';
import { auditLogQueue, type IAuditLogQueue } from 'src/config/queue';
import type {
  AuditLogItem,
  AuditLogListParams,
  AuditLogListRes,
} from 'src/dtos/audit-logs.dto';
import {
  AuditLogVisibility,
  type AuditLogWhereInput,
  LogType,
  type SecurityEventSeverity,
  type SecurityEventType,
} from 'src/generated';
import { executeListQuery } from 'src/services/shared/utils';
import {
  ACTIVITY_TYPE,
  AuditEventCategory,
  BadReqErr,
  type EnrichedAuditLogEntry,
  ErrCode,
  getSecurityEventDescription,
  LOG_LEVEL,
  type PrismaTx,
} from 'src/share';
import { AuditLogFactory } from './audit-log.factory';
import { normalizeLegacyPayload } from './legacy-payload.util';
import type { AuditEventInput } from './types';

const JOB_NAME = 'audit-log';

type CreateSecurityEventParams = {
  userId?: string;
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  location?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
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
      factory: AuditLogFactory;
    } = {
      db,
      queue: auditLogQueue,
      factory: new AuditLogFactory(),
    },
  ) {}

  logSecurityEvent(params: CreateSecurityEventParams): Promise<string> {
    const { userId, eventType, severity, location, metadata } = params;

    return this.push<ACTIVITY_TYPE.SECURITY_EVENT>({
      logType: LogType.security,
      type: ACTIVITY_TYPE.SECURITY_EVENT,
      payload: {
        category: AuditEventCategory.SECURITY,
        metadata,
        location,
      },
      eventType,
      severity,
      description: getSecurityEventDescription(eventType, metadata),
      userId,
      resolved: false,
      level: LOG_LEVEL.WARNING,
    });
  }

  async push<T extends ACTIVITY_TYPE>(
    entry: Omit<AuditEventInput<T>, 'ip' | 'userAgent' | 'requestId'>,
  ): Promise<string> {
    const { entry: enrichedEntry, logId } = this.deps.factory.create(
      entry as AuditEventInput<T>,
    );

    await this.deps.queue.add(JOB_NAME, enrichedEntry, {
      jobId: logId,
    });

    return logId;
  }

  async pushBatch<T extends ACTIVITY_TYPE>(
    entries: Omit<AuditEventInput<T>, 'ip' | 'userAgent' | 'requestId'>[],
  ): Promise<string[]> {
    if (entries.length === 0) return [];

    const jobIds: string[] = [];
    const enrichedEntries: { name: string; data: EnrichedAuditLogEntry }[] = [];

    for (const entry of entries) {
      const { entry: enrichedEntry, logId } = this.deps.factory.create(
        entry as AuditEventInput<T>,
      );
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

  async list(params: AuditLogListParams): Promise<AuditLogListRes> {
    const {
      take,
      skip,
      userId,
      subjectUserId,
      sessionId,
      entityType,
      entityId,
      eventType,
      severity,
      resolved,
      level,
      logType,
      category,
      visibility,
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
    }

    if (subjectUserId) {
      if (!hasViewPermission && subjectUserId !== currentUserId) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }
      conditions.push({ subjectUserId });
    }

    if (category) {
      conditions.push({ category });
    }

    const userVisible = new Set<AuditLogVisibility>([
      AuditLogVisibility.actor_only,
      AuditLogVisibility.actor_and_subject,
      AuditLogVisibility.public,
    ]);

    if (visibility) {
      if (!hasViewPermission && !userVisible.has(visibility)) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }
      conditions.push({ visibility });
    }

    if (!hasViewPermission) {
      conditions.push({
        OR: [{ userId: currentUserId }, { subjectUserId: currentUserId }],
      });
      conditions.push({
        visibility: { in: Array.from(userVisible) },
      });
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
        description: true,
        level: true,
        logType: true,
        category: true,
        visibility: true,
        eventType: true,
        severity: true,
        userId: true,
        subjectUserId: true,
        sessionId: true,
        entityType: true,
        entityId: true,
        entityDisplay: true,
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

    const formattedDocs: AuditLogItem[] = docs.map((doc) => {
      const normalizedPayload = normalizeLegacyPayload(doc.payload, {
        description: doc.description,
        userId: doc.userId,
        subjectUserId: doc.subjectUserId,
        entityType: doc.entityType,
        entityId: doc.entityId,
      });

      return {
        ...doc,
        category: doc.category ?? undefined,
        visibility: doc.visibility ?? AuditLogVisibility.actor_only,
        payload: normalizedPayload,
        id: doc.id.toString(),
      };
    });

    return {
      docs: formattedDocs,
      count,
    };
  }
}

export const auditLogsService = new AuditLogsService();
