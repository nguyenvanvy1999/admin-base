import { db, type IDb } from 'src/config/db';
import { auditLogQueue, type IAuditLogQueue } from 'src/config/queue';
import type {
  AuditLogItem,
  AuditLogListParams,
  AuditLogListRes,
} from 'src/dtos/audit-logs.dto';
import {
  type AuditLogSelect,
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

const USER_VISIBLE = new Set<AuditLogVisibility>([
  AuditLogVisibility.actor_only,
  AuditLogVisibility.actor_and_subject,
  AuditLogVisibility.public,
]);

const AUDIT_LOG_LIST_SELECT = {
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
} satisfies AuditLogSelect;

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

  private buildJob<T extends ACTIVITY_TYPE>(
    entry: Omit<AuditEventInput<T>, 'ip' | 'userAgent' | 'requestId'>,
  ) {
    const { entry: enrichedEntry, logId } = this.deps.factory.create(
      entry as AuditEventInput<T>,
    );

    return { logId, enrichedEntry };
  }

  async push<T extends ACTIVITY_TYPE>(
    entry: Omit<AuditEventInput<T>, 'ip' | 'userAgent' | 'requestId'>,
  ): Promise<string> {
    const { enrichedEntry, logId } = this.buildJob(entry);

    await this.deps.queue.add(JOB_NAME, enrichedEntry, {
      jobId: logId,
    });

    return logId;
  }

  async pushBatch<T extends ACTIVITY_TYPE>(
    entries: Omit<AuditEventInput<T>, 'ip' | 'userAgent' | 'requestId'>[],
  ): Promise<string[]> {
    if (entries.length === 0) return [];

    const jobs = entries.map((entry) => this.buildJob(entry));
    const jobIds = jobs.map((job) => job.logId);
    const enrichedEntries: { name: string; data: EnrichedAuditLogEntry }[] =
      jobs.map((job) => ({ name: JOB_NAME, data: job.enrichedEntry }));

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

    const assertCanView = (targetUserId?: string | null) => {
      if (!targetUserId) return;
      if (!hasViewPermission && targetUserId !== currentUserId) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }
    };

    const pushCondition = <T>(
      value: T | undefined | null,
      build: (val: T) => AuditLogWhereInput,
    ) => {
      if (value !== undefined && value !== null) {
        conditions.push(build(value));
      }
    };

    assertCanView(userId);
    assertCanView(subjectUserId);

    pushCondition(userId, (val) => ({ userId: val }));
    pushCondition(subjectUserId, (val) => ({ subjectUserId: val }));
    pushCondition(category, (val) => ({ category: val }));
    pushCondition(visibility, (val) => {
      if (!hasViewPermission && !USER_VISIBLE.has(val)) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }
      return { visibility: val };
    });

    if (!hasViewPermission) {
      conditions.push({
        OR: [{ userId: currentUserId }, { subjectUserId: currentUserId }],
      });
      conditions.push({
        visibility: { in: Array.from(USER_VISIBLE) },
      });
    }

    pushCondition(sessionId, (val) => ({ sessionId: val }));
    pushCondition(entityType, (val) => ({ entityType: val }));
    pushCondition(entityId, (val) => ({ entityId: val }));
    pushCondition(eventType, (val) => ({ eventType: val }));
    pushCondition(severity, (val) => ({ severity: val }));
    if (resolved !== undefined) {
      conditions.push({ resolved });
    }
    pushCondition(level, (val) => ({ level: val }));
    pushCondition(logType, (val) => ({ logType: val }));
    pushCondition(ip, (val) => ({ ip: val }));
    pushCondition(traceId, (val) => ({ traceId: val }));
    pushCondition(correlationId, (val) => ({ correlationId: val }));

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
      select: AUDIT_LOG_LIST_SELECT,
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
