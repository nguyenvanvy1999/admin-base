import { AsyncLocalStorage } from 'node:async_hooks';
import { BadReqErr, ErrCode } from '../error';
import type { IReqMeta } from '../type';

export const ctxStore = new AsyncLocalStorage<
  IReqMeta & { userId?: string; sessionId?: string }
>();

export function getIpAndUa(): {
  clientIp: string;
  userAgent: string;
} {
  const { clientIp, userAgent } = ctxStore.getStore() ?? {};
  if (!clientIp || !userAgent) {
    throw new BadReqErr(ErrCode.InternalError, {
      errors: 'Client IP or User Agent not available',
    });
  }
  return { clientIp, userAgent };
}
