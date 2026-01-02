import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type {
  AuthMethodType,
  AuthTxState,
  ChallengeType,
} from 'src/services/auth/types/constants';

export interface AuthTx {
  id: string;
  userId: string;
  createdAt: number;
  state: AuthTxState;
  challengeType?: ChallengeType;

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
    enabled: AuthMethodType[];
    labels: Record<AuthMethodType, { label: string; description?: string }>;
  };
  deviceVerify: {
    enabled: AuthMethodType[];
    labels: Record<AuthMethodType, { label: string; description?: string }>;
  };
  mfaEnroll: {
    enabled: AuthMethodType[];
    labels: Record<AuthMethodType, { label: string; description?: string }>;
  };
}
