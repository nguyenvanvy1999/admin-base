import type { ActivityTypeMap } from '../type/type';
import type { ACTIVITY_TYPE } from './app.constant';

type LoginErrorPayload = ActivityTypeMap[typeof ACTIVITY_TYPE.LOGIN];

export const MFA_ERROR_PAYLOADS = {
  SESSION_EXPIRED: { method: 'email', error: 'mfa_session_expired' },
  INVALID_OTP: { method: 'email', error: 'mfa_invalid_otp' },
  USER_NOT_FOUND: { method: 'email', error: 'mfa_user_not_found' },
  USER_NOT_ACTIVE: { method: 'email', error: 'user_not_active' },
  INVALID_BACKUP_CODE: { method: 'backup-code', error: 'invalid_backup_code' },
  SECURITY_BLOCKED: { method: 'email', error: 'security_blocked' },
  TOO_MANY_ATTEMPTS: { method: 'email', error: 'too_many_attempts' },
} as const satisfies Record<string, LoginErrorPayload>;
