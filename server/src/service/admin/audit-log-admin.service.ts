import { db, type IDb } from 'src/config/db';
import type { AuditLogWhereInput } from 'src/generated';
import type { AuditLogListQueryDto } from 'src/modules/audit-logs';
import { BadReqErr, ErrCode } from 'src/share';

type ListParams = typeof AuditLogListQueryDto.static & {
  currentUserId: string;
  hasViewPermission: boolean;
};

export class AuditLogAdminService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async list(params: ListParams) {
    const {
      take = 20,
      skip = 0,
      userId,
      sessionId,
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

    const [docs, count] = await this.deps.db.$transaction([
      this.deps.db.auditLog.findMany({
        where,
        select: {
          id: true,
          payload: true,
          level: true,
          logType: true,
          userId: true,
          sessionId: true,
          ip: true,
          userAgent: true,
          requestId: true,
          traceId: true,
          correlationId: true,
          occurredAt: true,
          created: true,
        },
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
      }),
      this.deps.db.auditLog.count({ where }),
    ]);

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

export const auditLogAdminService = new AuditLogAdminService();
