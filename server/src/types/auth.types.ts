import type { SecurityCheckResult } from 'src/services/auth/security/security-monitor.service';
import type { AuthChallengeType } from 'src/services/auth/types/constants';

export type AuthTxState =
  | 'PASSWORD_VERIFIED' // password OK, does not complete next step
  | 'CHALLENGE_MFA_REQUIRED' // require MFA (TOTP/backup)
  | 'CHALLENGE_MFA_ENROLL' // require enroll TOTP
  | 'CHALLENGE_DEVICE_VERIFY' // new device verification
  | 'COMPLETED'; // complete login, usually delete tx

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

export interface AuthMethodOption {
  method: AuthChallengeType;
  label: string;
  description?: string;
  requiresSetup?: boolean;
}

export interface ChallengeMetadata {
  email?: {
    destination: string;
    sentAt?: number;
  };
  totp?: {
    allowBackupCode: boolean;
  };
  enrollment?: {
    methods: string[];
    backupCodesWillBeGenerated: boolean;
  };
  device?: {
    isNewDevice: boolean;
    deviceFingerprint?: string;
  };
}

export type ChallengeDto =
  | {
      type: AuthChallengeType.MFA_REQUIRED;
      availableMethods: AuthMethodOption[];
      metadata?: ChallengeMetadata;
    }
  | {
      type: AuthChallengeType.DEVICE_VERIFY;
      availableMethods: AuthMethodOption[];
      metadata?: ChallengeMetadata;
    }
  | {
      type: AuthChallengeType.MFA_ENROLL;
      availableMethods: AuthMethodOption[];
      metadata?: ChallengeMetadata;
    };
