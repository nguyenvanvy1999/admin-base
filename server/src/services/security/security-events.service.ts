import { db, type IDb } from 'src/config/db';
import type { AuditLogWhereInput } from 'src/generated';
import {
  LogType,
  type SecurityEventSeverity,
  type SecurityEventType,
} from 'src/generated';
import {
  ACTIVITY_TYPE,
  type AuditLogEntry,
  BadReqErr,
  ErrCode,
  getIpAndUa,
  getSecurityEventDescription,
  inferSeverityFromEventType,
  LOG_LEVEL,
  type PrismaTx,
} from 'src/share';
import { auditLogsService } from '../audit-logs/audit-logs.service';
import { executeListQuery } from '../shared/utils';

type CreateSecurityEventParams = {
  userId?: string;
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  ip?: string;
  userAgent?: string;
  location?: Record<string, any>;
  metadata?: Record<string, any>;
  tx?: PrismaTx;
};

type ResolveSecurityEventParams = {
  id: string;
  resolvedBy: string;
  tx?: PrismaTx;
};

export class SecurityEventsService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async create(params: CreateSecurityEventParams): Promise<void> {
    const { userId, eventType, severity, ip, userAgent, location, metadata } =
      params;

    const { clientIp, userAgent: ctxUserAgent } = getIpAndUa();
    const finalIp = ip ?? clientIp;
    const finalUserAgent = userAgent ?? ctxUserAgent;
    const finalSeverity = severity ?? inferSeverityFromEventType(eventType);

    await auditLogsService.push({
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

  resolve(params: ResolveSecurityEventParams) {
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

  async list(params: ListSecurityEventsParams) {
    const {
      take,
      skip,
      userId,
      eventType,
      severity,
      resolved,
      created0,
      created1,
      currentUserId,
      hasViewPermission,
    } = params;

    const conditions: AuditLogWhereInput[] = [{ logType: LogType.security }];

    if (userId) {
      if (!hasViewPermission && userId !== currentUserId) {
        throw new BadReqErr(ErrCode.PermissionDenied);
      }
      conditions.push({ userId });
    } else if (!hasViewPermission) {
      conditions.push({ userId: currentUserId });
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

    if (created0 || created1) {
      const dateCondition: AuditLogWhereInput['occurredAt'] = {};
      if (created0) {
        dateCondition.gte = new Date(created0);
      }
      if (created1) {
        dateCondition.lte = new Date(created1);
      }
      conditions.push({ occurredAt: dateCondition });
    }

    const where = conditions.length > 0 ? { AND: conditions } : undefined;

    const { docs, count } = await executeListQuery(this.deps.db.auditLog, {
      where,
      select: {
        id: true,
        userId: true,
        eventType: true,
        severity: true,
        ip: true,
        userAgent: true,
        payload: true,
        resolved: true,
        resolvedAt: true,
        resolvedBy: true,
        occurredAt: true,
        created: true,
      },
      skip,
      take,
      orderBy: { occurredAt: 'desc' },
    });

    const formattedDocs = docs.map((doc) => {
      const payload =
        doc.payload && typeof doc.payload === 'object'
          ? (doc.payload as Record<string, any>)
          : {};

      return {
        ...doc,
        id: doc.id.toString(),
        location: payload.location ?? null,
        metadata: payload,
        description: getSecurityEventDescription(
          doc.eventType as SecurityEventType,
          payload,
        ),
      };
    });

    return {
      docs: formattedDocs,
      count,
    };
  }
}

export const securityEventsService = new SecurityEventsService();
