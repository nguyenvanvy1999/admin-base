export type AuthFlowStep = 'credentials' | 'mfa' | 'backup' | 'success';

export type MfaMethod = 'totp' | 'sms' | 'email' | 'push' | 'backup';

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  issuedAt?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}

export interface DeviceFingerprint {
  id: string;
  issuedAt: string;
  expiresAt?: string;
  label?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  locale?: string;
  roles?: string[];
  permissions?: string[];
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  deviceId?: string;
  rememberDevice?: boolean;
}

export interface LoginSuccessResponse {
  status: 'authenticated';
  tokens: TokenSet;
  user: AuthUser;
}

export interface MfaChallenge {
  challengeId: string;
  method: MfaMethod;
  expiresAt: string;
  maskedDestination?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
  backupCodesRemaining?: number;
  allowBackupCode?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MfaRequiredResponse {
  status: 'mfa_required';
  challenge: MfaChallenge;
}

export interface BackupRequiredResponse {
  status: 'backup_required';
  challenge: MfaChallenge;
}

export type LoginResponse =
  | LoginSuccessResponse
  | MfaRequiredResponse
  | BackupRequiredResponse;

export interface VerifyMfaPayload {
  challengeId: string;
  code: string;
  deviceId?: string;
  rememberDevice?: boolean;
}

export interface VerifyBackupPayload {
  challengeId: string;
  backupCode: string;
  deviceId?: string;
}

export interface BackupCodeStatus {
  remainingCodes: number;
  lastUsedAt?: string;
  regeneratedAt?: string;
  lockedUntil?: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface AuthSession {
  user: AuthUser | null;
  tokens: TokenSet | null;
}

export interface AuthStateSnapshot extends AuthSession {
  bootstrapped: boolean;
}
