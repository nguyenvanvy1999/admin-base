import type { Elysia } from 'elysia';
import { RateLimitStrategy } from 'src/generated';
import { BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import { generateIdentifier } from './rate-limit.middleware';
import { rateLimitService } from './rate-limit.service';
import { rateLimitConfigService } from './rate-limit-config.service';

export function authRateLimitMiddleware() {
  return (app: Elysia) =>
    app.onBeforeHandle(async (context) => {
      const path =
        context.path || (context.request as any)?.url?.pathname || '';
      const config = await rateLimitConfigService.getConfig(path);

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
          routePath: config.routePath,
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
