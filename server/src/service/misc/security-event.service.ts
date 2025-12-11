import { db, type IDb } from 'src/config/db';
import { securityEventQueue } from 'src/config/queue';
import type {
  SecurityEventSeverity,
  SecurityEventType,
  SecurityEventWhereInput,
} from 'src/generated';
import {
  BadReqErr,
  ErrCode,
  getIpAndUa,
  getSecurityEventDescription,
  IdUtil,
  inferSeverityFromEventType,
  type PrismaTx,
  shouldAutoResolve,
} from 'src/share';

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

type ListSecurityEventsParams = {
  take?: number;
  skip?: number;
  userId?: string;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  resolved?: boolean;
  created0?: string;
  created1?: string;
  currentUserId: string;
  hasViewPermission: boolean;
};

export class SecurityEventService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async create(params: CreateSecurityEventParams): Promise<void> {
    const {
      userId,
      eventType,
      severity,
      ip,
      userAgent,
      location,
      metadata,
      tx,
    } = params;

    const { clientIp, userAgent: ctxUserAgent } = getIpAndUa();
    const finalIp = ip ?? clientIp;
    const finalUserAgent = userAgent ?? ctxUserAgent;

    if (tx) {
      return this.createDirect({
        userId,
        eventType,
        severity,
        ip: finalIp,
        userAgent: finalUserAgent,
        location,
        metadata,
        tx,
      });
    }

    await securityEventQueue.add('create', {
      userId,
      eventType: eventType as string,
      severity: severity as string | undefined,
      ip: finalIp,
      userAgent: finalUserAgent,
      location,
      metadata,
    });
  }

  async createDirect(params: CreateSecurityEventParams) {
    const {
      userId,
      eventType,
      severity,
      ip,
      userAgent,
      location,
      metadata,
      tx,
    } = params;

    let finalIp = ip;
    let finalUserAgent = userAgent;
    if (!finalIp || !finalUserAgent) {
      const { clientIp, userAgent: ctxUserAgent } = getIpAndUa();
      finalIp = finalIp ?? clientIp;
      finalUserAgent = finalUserAgent ?? ctxUserAgent;
    }
    const finalSeverity = severity ?? inferSeverityFromEventType(eventType);
    const autoResolve = shouldAutoResolve(eventType);

    const data = {
      id: IdUtil.dbId(),
      userId,
      eventType,
      severity: finalSeverity,
      ip: finalIp,
      userAgent: finalUserAgent,
      location: location ? (location as any) : undefined,
      metadata: metadata ? (metadata as any) : undefined,
      resolved: autoResolve,
      resolvedAt: autoResolve ? new Date() : undefined,
      resolvedBy: autoResolve ? userId : undefined,
    };

    const dbInstance = tx || this.deps.db;
    await dbInstance.securityEvent.create({
      data,
      select: {
        id: true,
      },
    });
  }

  resolve(params: ResolveSecurityEventParams) {
    const { id, resolvedBy, tx } = params;

    const dbInstance = tx || this.deps.db;
    return dbInstance.securityEvent.update({
      where: { id },
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
      take = 20,
      skip = 0,
      userId,
      eventType,
      severity,
      resolved,
      created0,
      created1,
      currentUserId,
      hasViewPermission,
    } = params;

    const conditions: SecurityEventWhereInput[] = [];

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
      const dateCondition: SecurityEventWhereInput['created'] = {};
      if (created0) {
        dateCondition.gte = new Date(created0);
      }
      if (created1) {
        dateCondition.lte = new Date(created1);
      }
      conditions.push({ created: dateCondition });
    }

    const where = conditions.length > 0 ? { AND: conditions } : undefined;

    const [docs, count] = await this.deps.db.$transaction([
      this.deps.db.securityEvent.findMany({
        where,
        select: {
          id: true,
          userId: true,
          eventType: true,
          severity: true,
          ip: true,
          userAgent: true,
          location: true,
          metadata: true,
          resolved: true,
          resolvedAt: true,
          resolvedBy: true,
          created: true,
        },
        skip,
        take,
        orderBy: { created: 'desc' },
      }),
      this.deps.db.securityEvent.count({ where }),
    ]);

    const formattedDocs = docs.map((doc) => ({
      ...doc,
      description: getSecurityEventDescription(
        doc.eventType,
        doc.metadata as any,
      ),
    }));

    return {
      docs: formattedDocs,
      count,
    };
  }
}

export const securityEventService = new SecurityEventService();
