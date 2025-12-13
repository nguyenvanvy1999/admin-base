import { db, type IDb } from 'src/config/db';
import { auditLogQueue, type IAuditLogQueue } from 'src/config/queue';
import type { AuditLogListParams } from 'src/dtos/audit-logs.dto';
import type { AuditLogWhereInput } from 'src/generated';
import { executeListQuery } from 'src/service/utils';
import type { ACTIVITY_TYPE, AuditLogEntry } from 'src/share';
import {
  BadReqErr,
  ctxStore,
  ErrCode,
  extractEntityIdFromPayload,
  generateAuditLogDescription,
  IdUtil,
  inferEntityTypeFromActivityType,
  LOG_LEVEL,
} from 'src/share';

const JOB_NAME = 'audit-log';

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

    const entityType =
      entry.entityType ?? inferEntityTypeFromActivityType(entry.type);
    const entityId =
      entry.entityId ?? extractEntityIdFromPayload(entry.type, entry.payload);
    const description =
      entry.description ??
      generateAuditLogDescription(entry.type, entry.payload);

    const enrichedEntry: AuditLogEntry & {
      logId: string;
      timestamp: Date;
    } = {
      ...entry,
      logId: logId,
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

  async list(params: AuditLogListParams) {
    const {
      take,
      skip,
      userId,
      sessionId,
      entityType,
      entityId,
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

    if (level) {
      conditions.push({ level });
    }

    if (logType) {
      conditions.push({ logType });
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
