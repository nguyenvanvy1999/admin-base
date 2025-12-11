import type { Elysia } from 'elysia';
import { RateLimitStrategy, type RateLimitType } from 'src/generated';
import { BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import { rateLimitService } from './rate-limit.service';

export type RateLimitConfig = {
  type: RateLimitType;
  limit: number;
  windowSeconds: number;
  strategy?: RateLimitStrategy;
  getIdentifier?: (context: any) => string;
};

export function generateIdentifier(
  strategy: RateLimitStrategy,
  context: any,
  getIdentifier?: (context: any) => string,
): { identifier: string; ip?: string; userAgent?: string } {
  const { clientIp, userAgent } = getIpAndUa();
  const userId = context.currentUser?.id;

  switch (strategy) {
    case RateLimitStrategy.user:
      if (!userId) {
        throw new BadReqErr(ErrCode.InternalError, {
          errors: 'User ID is required for user-based rate limiting',
        });
      }
      return {
        identifier: `user:${userId}`,
        ip: clientIp,
        userAgent,
      };

    case RateLimitStrategy.ip:
      return {
        identifier: `ip:${clientIp}`,
        ip: clientIp,
        userAgent,
      };

    case RateLimitStrategy.ip_ua: {
      const uaHash = userAgent
        ? Buffer.from(userAgent).toString('base64').slice(0, 16)
        : 'unknown';
      return {
        identifier: `ip+ua:${clientIp}:${uaHash}`,
        ip: clientIp,
        userAgent,
      };
    }

    case RateLimitStrategy.custom:
      if (!getIdentifier) {
        throw new BadReqErr(ErrCode.InternalError, {
          errors: 'getIdentifier is required for custom strategy',
        });
      }
      return {
        identifier: getIdentifier(context),
        ip: clientIp,
        userAgent,
      };

    default:
      return {
        identifier: `ip:${clientIp}`,
        ip: clientIp,
        userAgent,
      };
  }
}

export const rateLimit = (config: RateLimitConfig) => {
  const strategy = config.strategy ?? RateLimitStrategy.ip;

  return (app: Elysia) =>
    app.onBeforeHandle(async (context) => {
      const { type, limit, windowSeconds, getIdentifier } = config;

      const { identifier, ip, userAgent } = generateIdentifier(
        strategy,
        context,
        getIdentifier,
      );

      const userId = (context as any).currentUser?.id;

      const result = await rateLimitService.checkAndIncrement({
        identifier,
        type,
        limit,
        windowSeconds,
        userId,
        ip,
        userAgent,
      });

      if (!result.allowed) {
        throw new BadReqErr(ErrCode.RateLimitExceeded, {
          errors: `Rate limit exceeded. Limit: ${limit} requests per ${windowSeconds} seconds`,
        });
      }

      return;
    });
};
