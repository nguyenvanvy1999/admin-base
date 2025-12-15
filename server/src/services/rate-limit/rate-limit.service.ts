import { rateLimitCache } from 'src/config/cache';
import { redis } from 'src/config/redis';
import { SecurityEventSeverity, SecurityEventType } from 'src/generated';
import { securityEventsService } from 'src/services/security';
import { getIpAndUa } from 'src/share';

type CheckAndIncrementParams = {
  identifier: string;
  routePath: string;
  limit: number;
  windowSeconds: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
};

type BlockParams = {
  identifier: string;
  routePath: string;
  blockedUntil?: Date;
};

export class RateLimitService {
  private buildWindowKey(
    identifier: string,
    routePath: string,
    window: number,
  ) {
    return `${identifier}:${routePath}:${window}`;
  }

  private buildBlockKey(identifier: string, routePath: string) {
    return `block:${identifier}:${routePath}`;
  }

  async checkAndIncrement(
    params: CheckAndIncrementParams,
  ): Promise<{ allowed: boolean; count: number; remaining: number }> {
    const {
      identifier,
      routePath,
      limit,
      windowSeconds,
      userId,
      ip,
      userAgent,
    } = params;

    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / (windowSeconds * 1000)) *
        (windowSeconds * 1000),
    );

    const blockKey = this.buildBlockKey(identifier, routePath);
    const blockedValue = await redis.get(blockKey);

    if (blockedValue) {
      return {
        allowed: false,
        count: 0,
        remaining: 0,
      };
    }

    const cacheKey = this.buildWindowKey(
      identifier,
      routePath,
      windowStart.getTime(),
    );

    const currentCount = await redis.incr(cacheKey);

    if (currentCount === 1) {
      await redis.expire(cacheKey, windowSeconds);
    }

    // Backfill in-memory cache for compatibility with existing callers
    await rateLimitCache.set(cacheKey, currentCount, windowSeconds);

    if (currentCount > limit) {
      const { clientIp, userAgent: ctxUserAgent } = getIpAndUa();
      const finalIp = ip ?? clientIp;
      const finalUserAgent = userAgent ?? ctxUserAgent;

      await securityEventsService.create({
        userId,
        eventType: SecurityEventType.suspicious_activity,
        severity: SecurityEventSeverity.high,
        ip: finalIp,
        userAgent: finalUserAgent,
        metadata: {
          routePath,
          identifier,
          count: currentCount,
          limit,
          windowSeconds,
        },
      });

      return {
        allowed: false,
        count: currentCount,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      count: currentCount,
      remaining: Math.max(0, limit - currentCount),
    };
  }
  async block(params: BlockParams): Promise<void> {
    const { identifier, routePath, blockedUntil } = params;
    const blockKey = this.buildBlockKey(identifier, routePath);

    if (blockedUntil) {
      const ttlSeconds = Math.max(
        1,
        Math.ceil((blockedUntil.getTime() - Date.now()) / 1000),
      );
      await redis.set(blockKey, blockedUntil.toISOString(), 'EX', ttlSeconds);
      return;
    }

    await redis.set(blockKey, 'permanent');
  }
}

export const rateLimitService = new RateLimitService();
