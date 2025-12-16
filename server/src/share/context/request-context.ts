import { AsyncLocalStorage } from 'node:async_hooks';
import { BadReqErr, ErrCode } from '../error';
import type { IReqMeta } from '../type';

export const ctxStore = new AsyncLocalStorage<
  IReqMeta & { userId?: string; sessionId?: string; apiKeyId?: string }
>();

export function getIpAndUa<T extends boolean = true>(
  required: T = true as T,
): T extends true
  ? {
      clientIp: string;
      userAgent: string;
    }
  : {
      clientIp: string | null;
      userAgent: string | null;
    } {
  const { clientIp, userAgent } = ctxStore.getStore() ?? {};
  if (required) {
    if (!clientIp || !userAgent) {
      throw new BadReqErr(ErrCode.InternalError, {
        errors: 'Client IP or User Agent not available',
      });
    }
  }

  return {
    clientIp: clientIp ?? null,
    userAgent: userAgent ?? null,
  } as any;
}
