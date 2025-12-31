import type { SecurityCheckResult } from 'src/services/auth/security-monitor.service';

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

export type ChallengeDto =
  | { type: 'MFA_TOTP'; allowBackupCode: true }
  | { type: 'MFA_BACKUP_CODE' }
  | { type: 'MFA_EMAIL_OTP' }
  | { type: 'DEVICE_VERIFY'; media: 'email'; destination: string }
  | {
      type: 'MFA_ENROLL';
      methods: Array<'totp'>;
      backupCodesWillBeGenerated: boolean;
    };
