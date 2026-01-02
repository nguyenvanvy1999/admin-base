import type { ErrCode } from 'src/share';
import type { AuthTx } from 'src/types/auth.types';
import type { User } from '../../../generated';
import type { SecurityCheckResult } from '../security/security-monitor.service';
import type { ChallengeType } from './constants';

export interface AuthMethodContext {
  authTxId: string;
  authTx: AuthTx;
  userId: string;
  code: string;
  clientIp: string;
  userAgent: string;
}

export interface AuthMethodResult {
  verified: boolean;
  errorCode?: ErrCode;
}

export type AuthContext = {
  user: Pick<User, 'id' | 'email' | 'mfaTotpEnabled' | 'status'>;
  authTx: AuthTx;
  securityResult?: SecurityCheckResult;
  challengeType: ChallengeType;
};
