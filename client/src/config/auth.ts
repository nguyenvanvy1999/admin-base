import { ACCESS_TOKEN_KEY } from 'src/constants';

export const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  loginMfa: '/api/auth/login/mfa',
  loginMfaConfirm: '/api/auth/login/mfa/confirm',
  profile: '/api/auth/me',
  logout: '/api/auth/logout',
  refreshToken: '/api/auth/refresh-token',
  mfaSetupRequest: '/api/auth/mfa/setup/request',
  mfaSetupConfirm: '/api/auth/mfa/setup/confirm',
  mfaDisable: '/api/auth/mfa/disable',
  mfaStatus: '/api/auth/mfa/status',
  backupCodesGenerate: '/api/auth/mfa/backup-codes/generate',
  backupCodesVerify: '/api/auth/mfa/backup-codes/verify',
  backupCodesRemaining: '/api/auth/mfa/backup-codes/remaining',
};

export const AUTH_STORAGE_KEYS = {
  accessToken: ACCESS_TOKEN_KEY,
  refreshToken: `${ACCESS_TOKEN_KEY}_refresh`,
  deviceId: `${ACCESS_TOKEN_KEY}_device`,
};

export const AUTH_MFA_CONFIG = {
  otpLength: 6,
  otpTtlSeconds: 60,
  backupBatchSize: 10,
  resendCoolDownSeconds: 30,
};
