export type AuthFlowStep =
  | 'credentials'
  | 'mfa-setup'
  | 'mfa-challenge'
  | 'backup'
  | 'success';

export type LoginResponseType = 'completed' | 'mfa-confirm' | 'mfa-setup';

export type UserStatus = 'inactive' | 'active' | 'suspendded' | 'banned';

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
  status: UserStatus;
  permissions: string[];
  mfaTotpEnabled: boolean;
  created: string;
  modified: string;
  name?: string;
  avatar?: string;
  locale?: string;
  roles?: string[];
  lastLoginAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface RegisterResponse {
  otpToken: string;
}

export type OtpPurpose = 'register';

export interface SendOtpPayload {
  email: string;
  purpose: OtpPurpose;
}

export interface VerifyAccountPayload {
  otpToken: string;
  otp: string;
}

export interface LoginCompletedResponse {
  type: 'completed';
  accessToken: string;
  refreshToken: string;
  exp: number;
  expired: string;
  user: AuthUser;
}

export interface LoginMfaConfirmResponse {
  type: 'mfa-confirm';
  mfaToken: string;
}

export interface LoginMfaSetupResponse {
  type: 'mfa-setup';
  setupToken: string;
}

export type LoginSuccessResponse = LoginCompletedResponse;

export type LoginResponse =
  | LoginCompletedResponse
  | LoginMfaConfirmResponse
  | LoginMfaSetupResponse;

export interface LoginMfaPayload {
  mfaToken: string;
  otp: string;
}

export interface ConfirmMfaLoginPayload {
  mfaToken: string;
  loginToken: string;
  otp: string;
}

export interface BackupCodeVerifyPayload {
  mfaToken: string;
  backupCode: string;
}

export interface MfaSetupRequestPayload {
  setupToken?: string;
}

export interface MfaSetupRequestResponse {
  mfaToken: string;
  totpSecret: string;
}

export interface MfaSetupConfirmPayload {
  mfaToken: string;
  otp: string;
}

export interface MfaSetupConfirmResponse {
  mfaToken: string;
  loginToken: string;
}

export interface BackupCodesGeneratePayload {
  otp: string;
}

export interface BackupCodesGenerateResponse {
  codes: string[];
  message: string;
}

export interface BackupCodesRemainingResponse {
  remaining: number;
  total: number;
}

export interface MfaStatusResponse {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
}

export interface DisableMfaPayload {
  otp?: string;
  backupCode?: string;
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
