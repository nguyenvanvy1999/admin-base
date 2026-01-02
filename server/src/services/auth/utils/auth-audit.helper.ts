import type { AuditLogVisibility } from 'src/generated';
import { SecurityEventSeverity, SecurityEventType } from 'src/generated';
import type { SecurityEventPayloadBase } from 'src/services/audit-logs/audit-logs.types';
import {
  toAuditAuthMethod,
  toAuditMfaMethod,
  toAuditMfaMethodLimited,
  toAuditRegisterMethod,
} from 'src/services/audit-logs/audit-logs.types';
import type { AuthMethod } from 'src/services/auth/types/constants';
import type { PurposeVerify } from 'src/share';

type UserForAudit = { id: string; email: string | null };

type AuditLogOptions = {
  userId?: string;
  sessionId?: string;
  visibility?: AuditLogVisibility;
  subjectUserId?: string;
};

export function buildLoginSuccessAuditLog(
  user: UserForAudit,
  method: AuthMethod | 'oauth' | 'api_key',
  options?: AuditLogOptions & {
    isNewDevice?: boolean;
    deviceFingerprint?: string;
  },
): SecurityEventPayloadBase<'login_success'> {
  return {
    category: 'security',
    eventType: SecurityEventType.login_success,
    severity: SecurityEventSeverity.low,
    method: toAuditAuthMethod(method),
    email: user.email ?? '',
    isNewDevice: options?.isNewDevice,
    deviceFingerprint: options?.deviceFingerprint,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildLoginFailedAuditLog(
  user: UserForAudit,
  method: AuthMethod | 'oauth' | 'api_key',
  error: string,
  options?: AuditLogOptions & {
    severity?: SecurityEventSeverity;
    attemptCount?: number;
  },
): SecurityEventPayloadBase<'login_failed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.login_failed,
    severity: options?.severity ?? SecurityEventSeverity.medium,
    method: toAuditAuthMethod(method),
    email: user.email ?? '',
    error,
    attemptCount: options?.attemptCount,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildMfaVerifiedAuditLog(
  user: UserForAudit,
  method: AuthMethod | 'backup-code',
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'mfa_verified'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_verified,
    severity: SecurityEventSeverity.low,
    method: toAuditMfaMethod(method),
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildMfaFailedAuditLog(
  user: UserForAudit,
  method: AuthMethod | 'backup-code',
  error: string,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'mfa_failed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_failed,
    severity: SecurityEventSeverity.medium,
    method: toAuditMfaMethod(method),
    error,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildMfaChallengeStartedAuditLog(
  user: UserForAudit,
  method: AuthMethod,
  options?: AuditLogOptions & {
    metadata?: Record<string, unknown>;
  },
): SecurityEventPayloadBase<'mfa_challenge_started'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_challenge_started,
    severity: SecurityEventSeverity.low,
    method: toAuditMfaMethodLimited(method),
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
      ...options?.metadata,
    },
  };
}

export function buildMfaSetupStartedAuditLog(
  user: UserForAudit,
  method: AuthMethod,
  stage: 'request' | 'required_before_login',
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'mfa_setup_started'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_setup_started,
    severity: SecurityEventSeverity.low,
    method: toAuditMfaMethodLimited(method),
    stage,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildMfaSetupCompletedAuditLog(
  user: UserForAudit,
  method: AuthMethod,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'mfa_setup_completed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_setup_completed,
    severity: SecurityEventSeverity.low,
    method: 'totp' as const,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildMfaDisabledAuditLog(
  user: UserForAudit,
  method: AuthMethod,
  disabledBy: 'user' | 'admin',
  options?: AuditLogOptions & {
    adminId?: string;
  },
): SecurityEventPayloadBase<'mfa_disabled'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_disabled,
    severity: SecurityEventSeverity.high,
    method: toAuditMfaMethodLimited(method),
    disabledBy,
    adminId: options?.adminId,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildMfaBackupCodesRegeneratedAuditLog(
  user: UserForAudit,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'mfa_backup_codes_regenerated'> {
  return {
    category: 'security',
    eventType: SecurityEventType.mfa_backup_codes_regenerated,
    severity: SecurityEventSeverity.medium,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildRegisterStartedAuditLog(
  user: UserForAudit,
  method: AuthMethod | 'oauth',
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'register_started'> {
  return {
    category: 'security',
    eventType: SecurityEventType.register_started,
    severity: SecurityEventSeverity.low,
    method: toAuditRegisterMethod(method),
    email: user.email ?? '',
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildRegisterFailedAuditLog(
  email: string,
  method: AuthMethod | 'oauth',
  error: string,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'register_failed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.register_failed,
    severity: SecurityEventSeverity.medium,
    method: toAuditRegisterMethod(method),
    email,
    error,
    metadata: {
      ...(options?.userId && { userId: options.userId }),
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildPasswordChangedAuditLog(
  user: UserForAudit,
  changedBy: 'user' | 'admin',
  options?: AuditLogOptions & {
    adminId?: string;
  },
): SecurityEventPayloadBase<'password_changed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.password_changed,
    severity: SecurityEventSeverity.medium,
    changedBy,
    adminId: options?.adminId,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildPasswordResetCompletedAuditLog(
  user: UserForAudit,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'password_reset_completed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.password_reset_completed,
    severity: SecurityEventSeverity.medium,
    email: user.email ?? '',
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildPasswordResetFailedAuditLog(
  email: string | undefined,
  error: string,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'password_reset_failed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.password_reset_failed,
    severity: SecurityEventSeverity.medium,
    email,
    error,
    metadata: {
      ...(options?.userId && { userId: options.userId }),
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildOtpInvalidAuditLog(
  email: string | undefined,
  purpose: PurposeVerify,
  error: string,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'otp_invalid'> {
  return {
    category: 'security',
    eventType: SecurityEventType.otp_invalid,
    severity: SecurityEventSeverity.medium,
    email,
    purpose,
    error,
    metadata: {
      ...(options?.userId && { userId: options.userId }),
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildRefreshTokenSuccessAuditLog(
  user: UserForAudit,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'refresh_token_success'> {
  return {
    category: 'security',
    eventType: SecurityEventType.refresh_token_success,
    severity: SecurityEventSeverity.low,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildRefreshTokenFailedAuditLog(
  user: UserForAudit,
  error: string,
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'refresh_token_failed'> {
  return {
    category: 'security',
    eventType: SecurityEventType.refresh_token_failed,
    severity: SecurityEventSeverity.medium,
    error,
    metadata: {
      userId: user.id,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
  };
}

export function buildLogoutAuditLog(
  user: UserForAudit,
  method: AuthMethod | 'oauth' | 'api_key',
  options?: AuditLogOptions,
): SecurityEventPayloadBase<'logout'> {
  return {
    category: 'security',
    eventType: SecurityEventType.logout,
    severity: SecurityEventSeverity.low,
    method: toAuditAuthMethod(method),
    email: user.email ?? '',
    sessionId: options?.sessionId,
    metadata: {
      userId: user.id,
    },
  };
}

export function buildAuditLogPushOptions(
  userId: string,
  options?: {
    sessionId?: string;
    visibility?: AuditLogVisibility;
    subjectUserId?: string;
  },
): {
  userId: string;
  sessionId?: string | null;
  visibility?: AuditLogVisibility;
  subjectUserId?: string;
} {
  return {
    userId,
    sessionId: options?.sessionId ?? null,
    visibility: options?.visibility,
    subjectUserId: options?.subjectUserId ?? userId,
  };
}
