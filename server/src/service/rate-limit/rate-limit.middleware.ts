import type { Elysia } from 'elysia';
import type { RateLimitType } from 'src/generated';
import { BadReqErr, ErrCode, getIpAndUa } from 'src/share';
import { rateLimitService } from './rate-limit.service';

type RateLimitConfig = {
  type: RateLimitType;
  limit: number;
  windowSeconds: number;
  getIdentifier?: (context: any) => string;
};

export const rateLimit = (config: RateLimitConfig) => {
  return (app: Elysia) =>
    app.onBeforeHandle(async (context) => {
      const { type, limit, windowSeconds, getIdentifier } = config;

      let identifier: string;
      if (getIdentifier) {
        identifier = getIdentifier(context);
      } else {
        const { clientIp } = getIpAndUa();
        identifier = clientIp;
      }

      const userId = (context as any).currentUser?.id;

      const result = await rateLimitService.checkAndIncrement({
        identifier,
        type,
        limit,
        windowSeconds,
        userId,
      });

      if (!result.allowed) {
        throw new BadReqErr(ErrCode.RateLimitExceeded, {
          errors: `Rate limit exceeded. Limit: ${limit} requests per ${windowSeconds} seconds`,
        });
      }

      return;
    });
};
