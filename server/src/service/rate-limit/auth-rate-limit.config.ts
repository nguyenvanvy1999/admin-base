import type { Context, Elysia, RouteSchema } from 'elysia';
import { env } from 'src/config/env';
import { RateLimitStrategy } from 'src/generated';
import { type AppAuthMeta, BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import { rateLimitService } from './rate-limit.service';
import { rateLimitConfigService } from './rate-limit-config.service';

export type RateLimitConfig = {
  routePath: string;
  limit: number;
  windowSeconds: number;
  strategy: RateLimitStrategy;
  getIdentifier?: (context: any) => string;
};

export function generateIdentifier(
  strategy: RateLimitStrategy,
  context: Context<RouteSchema, AppAuthMeta>,
  getIdentifier?: (context: Context<RouteSchema, AppAuthMeta>) => string,
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

function normalizePath(path: string): string {
  if (!path) return path;

  const apiPrefix = `/${env.API_PREFIX}`;
  if (path.startsWith(apiPrefix)) {
    return path.slice(apiPrefix.length) || '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function rateLimit() {
  return (app: Elysia<'', AppAuthMeta>) =>
    app.onBeforeHandle(async (context) => {
      const rawPath = context.path || context.request.url || '';
      const normalizedPath = normalizePath(rawPath);
      const config = await rateLimitConfigService.getConfig(normalizedPath);

      if (!config) {
        return;
      }

      const { clientIp, userAgent } = getIpAndUa();
      const userId = context.currentUser?.id;

      if (config.strategy === RateLimitStrategy.user && !userId) {
        return;
      }

      try {
        const {
          identifier,
          ip,
          userAgent: finalUserAgent,
        } = generateIdentifier(
          config.strategy ?? RateLimitStrategy.ip,
          context,
          config.getIdentifier,
        );

        const result = await rateLimitService.checkAndIncrement({
          identifier,
          routePath: config.routePath,
          limit: config.limit,
          windowSeconds: config.windowSeconds,
          userId,
          ip: ip ?? clientIp,
          userAgent: finalUserAgent ?? userAgent,
        });

        if (!result.allowed) {
          throw new BadReqErr(ErrCode.RateLimitExceeded, {
            errors: `Rate limit exceeded on ${config.routePath}. Limit: ${config.limit} requests per ${config.windowSeconds} seconds`,
          });
        }
      } catch (error) {
        if (
          error instanceof BadReqErr &&
          error.code === ErrCode.InternalError
        ) {
          return;
        }
        throw error;
      }
    });
}
