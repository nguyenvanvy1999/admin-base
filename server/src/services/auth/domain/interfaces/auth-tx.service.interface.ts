import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type {
  AuthTxState,
  ChallengeType,
} from 'src/services/auth/types/constants';
import type { AuthTx } from 'src/types/auth.types';

export interface IAuthTxService {
  create(
    userId: string,
    state: AuthTxState,
    ctx: { ip: string; ua?: string },
    securityResult?: SecurityCheckResult,
    challengeType?: ChallengeType,
  ): Promise<AuthTx>;
  get(id: string): Promise<AuthTx | null>;
  getOrThrow(id: string): Promise<AuthTx>;
  update(
    id: string,
    updates: Partial<Omit<AuthTx, 'id' | 'createdAt'>>,
  ): Promise<void>;
  delete(id: string): Promise<void>;
  assertBinding(tx: AuthTx, ctx: { ip: string; ua?: string }): void;
  incrementChallengeAttempts(id: string): Promise<AuthTx>;
  assertChallengeAttemptsAllowed(tx: AuthTx, maxAttempts?: number): void;
  attachEnroll(
    id: string,
    enroll: NonNullable<AuthTx['enroll']>,
  ): Promise<AuthTx>;
}
