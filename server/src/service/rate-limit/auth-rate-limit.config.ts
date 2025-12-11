import type { Elysia } from 'elysia';
import type { RateLimitType } from 'src/generated';
import { RateLimitStrategy } from 'src/generated';
import { BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import type { RateLimitConfig } from './rate-limit.middleware';
import { generateIdentifier } from './rate-limit.middleware';
import { rateLimitService } from './rate-limit.service';
import { rateLimitConfigService } from './rate-limit-config.service';

type AuthRouteConfig = {
  path: string;
  type: RateLimitType;
};

export const authRouteConfigs: AuthRouteConfig[] = [
  {
    path: '/auth/login',
    type: 'login',
  },
  {
    path: '/auth/login/mfa',
    type: 'login',
  },
  {
    path: '/auth/login/mfa/confirm',
    type: 'login',
  },
  {
    path: '/auth/user/register',
    type: 'email_verification',
  },
  {
    path: '/auth/user/verify-account',
    type: 'email_verification',
  },
  {
    path: '/auth/forgot-password',
    type: 'password_reset',
  },
  {
    path: '/auth/change-password',
    type: 'password_reset',
  },
  {
    path: '/auth/refresh-token',
    type: 'api',
  },
];

export async function getRateLimitConfigForRoute(
  path: string,
): Promise<RateLimitConfig | null> {
  const routeConfig = authRouteConfigs.find((c) => c.path === path);
  if (!routeConfig) {
    return null;
  }

  const config = await rateLimitConfigService.getConfigForType(
    routeConfig.type,
    path,
  );

  return config;
}

export function authRateLimitMiddleware() {
  return (app: Elysia) =>
    app.onBeforeHandle(async (context) => {
      const path =
        context.path || (context.request as any)?.url?.pathname || '';
      const config = await getRateLimitConfigForRoute(path);

      if (!config) {
        return;
      }

      const { clientIp, userAgent } = getIpAndUa();
      const userId = (context as any).currentUser?.id;

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
          type: config.type,
          limit: config.limit,
          windowSeconds: config.windowSeconds,
          userId,
          ip: ip ?? clientIp,
          userAgent: finalUserAgent ?? userAgent,
        });

        if (!result.allowed) {
          throw new BadReqErr(ErrCode.RateLimitExceeded, {
            errors: `Rate limit exceeded. Limit: ${config.limit} requests per ${config.windowSeconds} seconds`,
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
