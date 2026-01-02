import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type {
  AuthChallengeType,
  AuthTxState,
} from 'src/services/auth/types/constants';

export interface AuthTx {
  id: string;
  userId: string;
  createdAt: number;
  state: AuthTxState;

  // binding (reduce risk of authTxId being stolen)
  ipHash?: string;
  uaHash?: string;

  // prevent brute-force at challenge step
  challengeAttempts: number;

  // risk evaluation result (system dependent)
  securityResult?: SecurityCheckResult;

  // temporary enroll data
  enroll?: {
    enrollToken: string;
    tempTotpSecret: string;
    startedAt: number;
  };

  // context for email otp
  emailOtpToken?: string;

  // context for device verification
  deviceVerifyToken?: string;
}

export interface AuthMethodConfig {
  mfaRequired: {
    enabled: AuthChallengeType[];
    labels: Record<AuthChallengeType, { label: string; description?: string }>;
  };
  deviceVerify: {
    enabled: AuthChallengeType[];
    labels: Record<AuthChallengeType, { label: string; description?: string }>;
  };
  mfaEnroll: {
    enabled: AuthChallengeType[];
    labels: Record<AuthChallengeType, { label: string; description?: string }>;
  };
}
