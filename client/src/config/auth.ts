import { ACCESS_TOKEN_KEY } from 'src/constants';

export const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  profile: '/api/auth/me',
  logout: '/api/auth/logout',
  refresh: '/api/auth/refresh',
  verifyMfa: '/api/auth/mfa/verify',
  resendMfa: '/api/auth/mfa/resend',
  verifyBackup: '/api/auth/mfa/backup',
  challenge: '/api/auth/mfa/challenge',
  backupStatus: '/api/auth/mfa/backup/status',
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
