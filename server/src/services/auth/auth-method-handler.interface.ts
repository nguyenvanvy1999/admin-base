import type { AuthTx } from 'src/types/auth.types';
import type { AuthChallengeType } from './constants';

export interface AuthMethodContext {
  authTxId: string;
  authTx: AuthTx;
  userId: string;
  code: string;
  clientIp: string;
  userAgent: string;
}

import type { ErrCode } from 'src/share';

export interface AuthMethodResult {
  verified: boolean;
  errorCode?: ErrCode;
}

export interface IAuthMethodHandler {
  readonly type: AuthChallengeType;

  verify(context: AuthMethodContext): Promise<AuthMethodResult>;

  getAuthMethod(): string;
}
