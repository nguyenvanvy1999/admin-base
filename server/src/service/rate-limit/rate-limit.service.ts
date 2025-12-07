import { rateLimitCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type { RateLimitType, RateLimitWhereInput } from 'src/generated';
import { SecurityEventSeverity, SecurityEventType } from 'src/generated';
import { securityEventService } from 'src/service/misc/security-event.service';
import { getIpAndUa, IdUtil, type PrismaTx } from 'src/share';
import { DB_PREFIX } from 'src/share/constant/app.constant';

type CheckAndIncrementParams = {
  identifier: string;
  type: RateLimitType;
  limit: number;
  windowSeconds: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  tx?: PrismaTx;
};

type BlockParams = {
  identifier: string;
  type: RateLimitType;
  blockedUntil?: Date;
  tx?: PrismaTx;
};

type UnblockParams = {
  identifier: string;
  type: RateLimitType;
  tx?: PrismaTx;
};

type ListParams = {
  take?: number;
  skip?: number;
  identifier?: string;
  type?: RateLimitType;
  blocked?: boolean;
  created0?: string;
  created1?: string;
};

export class RateLimitService {
  constructor(private readonly deps: { db: IDb } = { db }) {}

  async checkAndIncrement(
    params: CheckAndIncrementParams,
  ): Promise<{ allowed: boolean; count: number; remaining: number }> {
    const {
      identifier,
      type,
      limit,
      windowSeconds,
      userId,
      ip,
      userAgent,
      tx,
    } = params;

    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / (windowSeconds * 1000)) *
        (windowSeconds * 1000),
    );
    const windowEnd = new Date(windowStart.getTime() + windowSeconds * 1000);

    const cacheKey = `${identifier}:${type}:${windowStart.getTime()}`;
    const cachedCount = await rateLimitCache.get(cacheKey);

    let currentCount = cachedCount ?? 0;

    const dbInstance = tx || this.deps.db;

    const existing = await dbInstance.rateLimit.findUnique({
      where: {
        rate_limit_unique: {
          identifier,
          type,
          windowStart,
        },
      },
    });

    const blockedRecord = await dbInstance.rateLimit.findFirst({
      where: {
        identifier,
        type,
        blocked: true,
        OR: [{ blockedUntil: null }, { blockedUntil: { gt: now } }],
      },
    });

    if (blockedRecord) {
      return {
        allowed: false,
        count: existing?.count ?? 0,
        remaining: 0,
      };
    }

    if (existing) {
      currentCount = existing.count;
    }

    if (currentCount >= limit) {
      const { clientIp, userAgent: ctxUserAgent } = getIpAndUa();
      const finalIp = ip ?? clientIp;
      const finalUserAgent = userAgent ?? ctxUserAgent;

      await securityEventService.create({
        userId,
        eventType: SecurityEventType.suspicious_activity,
        severity: SecurityEventSeverity.high,
        ip: finalIp,
        userAgent: finalUserAgent,
        metadata: {
          rateLimitType: type,
          identifier,
          count: currentCount,
          limit,
          windowSeconds,
        },
        tx,
      });

      return {
        allowed: false,
        count: currentCount,
        remaining: 0,
      };
    }

    const newCount = currentCount + 1;

    await rateLimitCache.set(cacheKey, newCount, windowSeconds);

    if (existing) {
      await dbInstance.rateLimit.update({
        where: {
          id: existing.id,
        },
        data: {
          count: newCount,
          modified: now,
        },
      });
    } else {
      await dbInstance.rateLimit.create({
        data: {
          id: IdUtil.dbId(DB_PREFIX.RATE_LIMIT),
          identifier,
          type,
          count: newCount,
          limit,
          windowStart,
          windowEnd,
        },
      });
    }

    return {
      allowed: true,
      count: newCount,
      remaining: Math.max(0, limit - newCount),
    };
  }

  async getCurrentCount(
    identifier: string,
    type: RateLimitType,
  ): Promise<number> {
    const now = new Date();
    const windowSeconds = 60;
    const windowStart = new Date(
      Math.floor(now.getTime() / (windowSeconds * 1000)) *
        (windowSeconds * 1000),
    );

    const cacheKey = `${identifier}:${type}:${windowStart.getTime()}`;
    const cachedCount = await rateLimitCache.get(cacheKey);

    if (cachedCount !== null) {
      return cachedCount;
    }

    const existing = await this.deps.db.rateLimit.findUnique({
      where: {
        rate_limit_unique: {
          identifier,
          type,
          windowStart,
        },
      },
      select: {
        count: true,
      },
    });

    return existing?.count ?? 0;
  }

  async block(params: BlockParams): Promise<void> {
    const { identifier, type, blockedUntil, tx } = params;

    const dbInstance = tx || this.deps.db;
    const now = new Date();

    await dbInstance.rateLimit.updateMany({
      where: {
        identifier,
        type,
        blocked: false,
      },
      data: {
        blocked: true,
        blockedUntil: blockedUntil ?? null,
        modified: now,
      },
    });
  }

  async unblock(params: UnblockParams): Promise<void> {
    const { identifier, type, tx } = params;

    const dbInstance = tx || this.deps.db;
    const now = new Date();

    await dbInstance.rateLimit.updateMany({
      where: {
        identifier,
        type,
        blocked: true,
      },
      data: {
        blocked: false,
        blockedUntil: null,
        modified: now,
      },
    });
  }

  async list(params: ListParams) {
    const {
      take = 20,
      skip = 0,
      identifier,
      type,
      blocked,
      created0,
      created1,
    } = params;

    const conditions: RateLimitWhereInput[] = [];

    if (identifier) {
      conditions.push({
        identifier: { contains: identifier, mode: 'insensitive' },
      });
    }

    if (type) {
      conditions.push({ type });
    }

    if (blocked !== undefined) {
      conditions.push({ blocked });
    }

    if (created0 || created1) {
      const dateCondition: RateLimitWhereInput['created'] = {};
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
      this.deps.db.rateLimit.findMany({
        where,
        select: {
          id: true,
          identifier: true,
          type: true,
          count: true,
          limit: true,
          windowStart: true,
          windowEnd: true,
          blocked: true,
          blockedUntil: true,
          created: true,
          modified: true,
        },
        skip,
        take,
        orderBy: { created: 'desc' },
      }),
      this.deps.db.rateLimit.count({ where }),
    ]);

    return {
      docs,
      count,
    };
  }

  async cleanupExpiredWindows(): Promise<number> {
    const now = new Date();

    const result = await this.deps.db.rateLimit.deleteMany({
      where: {
        windowEnd: {
          lt: now,
        },
        blocked: false,
      },
    });

    return result.count;
  }
}

export const rateLimitService = new RateLimitService();
