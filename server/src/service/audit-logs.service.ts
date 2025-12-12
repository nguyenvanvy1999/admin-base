import { db, type IDb } from 'src/config/db';
import type { AuditLogListParams } from 'src/dtos/audit-logs.dto';
import type { AuditLogWhereInput } from 'src/generated';
import { executeListQuery } from 'src/service/utils';
import { BadReqErr, ErrCode } from 'src/share';

export class AuditLogsService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

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
