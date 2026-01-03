import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import {
  AuthTxState,
  type ChallengeType,
} from 'src/services/auth/types/constants';

export class AuthTransaction {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly state: AuthTxState,
    public readonly createdAt: number,
    public challengeAttempts: number,
    public ipHash?: string,
    public uaHash?: string,
    public securityResult?: SecurityCheckResult,
    public challengeType?: ChallengeType,
    public enroll?: {
      enrollToken: string;
      tempTotpSecret: string;
      startedAt: number;
    },
    public emailOtpToken?: string,
    public deviceVerifyToken?: string,
  ) {}

  canTransitionTo(newState: AuthTxState): boolean {
    const validTransitions: Record<AuthTxState, AuthTxState[]> = {
      [AuthTxState.PASSWORD_VERIFIED]: [
        AuthTxState.CHALLENGE,
        AuthTxState.COMPLETED,
      ],
      [AuthTxState.CHALLENGE]: [AuthTxState.COMPLETED],
      [AuthTxState.COMPLETED]: [],
    };

    return validTransitions[this.state]?.includes(newState) ?? false;
  }

  isExpired(ttl: number): boolean {
    const elapsed = (Date.now() - this.createdAt) / 1000;
    return elapsed >= ttl;
  }

  hasExceededMaxAttempts(maxAttempts: number): boolean {
    return this.challengeAttempts >= maxAttempts;
  }
}
