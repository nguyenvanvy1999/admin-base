import { AsyncLocalStorage } from 'node:async_hooks';
import { BadReqErr, ErrCode } from '../error';

export type ReqContext = {
  reqId: string;
  ua: string;
  ip: string;
  userId?: string;
  sessionId?: string;
};

export const ctxStore = new AsyncLocalStorage<ReqContext>();

export function getClientIp(): string {
  const { ip } = ctxStore.getStore() ?? {};
  if (!ip) {
    throw new BadReqErr(ErrCode.InternalError, {
      errors: 'Client IP not available',
    });
  }
  return ip;
}

export function getClientIpAndUserAgent(): {
  clientIp: string;
  userAgent: string;
} {
  const { ip, ua } = ctxStore.getStore() ?? {};
  if (!ip || !ua) {
    throw new BadReqErr(ErrCode.InternalError, {
      errors: 'Client IP or User Agent not available',
    });
  }
  return { clientIp: ip, userAgent: ua };
}
