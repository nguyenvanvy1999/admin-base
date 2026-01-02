import type { SecurityEventSeverity, SecurityEventType } from 'src/generated';
import { AuthMethod } from 'src/services/auth/types/constants';
import type { PurposeVerify } from 'src/share';

export type AuthMethodType = `${AuthMethod}`;
export type AuditAuthMethod = AuthMethodType | 'oauth' | 'api_key';
export type AuditMfaMethod = 'totp' | 'email' | 'backup-code';
export type AuditRegisterMethod = 'email' | 'oauth';

export function toAuditAuthMethod(
  method: AuthMethod | 'oauth' | 'api_key',
): AuditAuthMethod {
  return method;
}

export function toAuditMfaMethod(
  method: AuthMethod | 'backup-code',
): AuditMfaMethod {
  if (method === 'backup-code') {
    return 'backup-code';
  }
  const authMethod = method as AuthMethod;
  if (authMethod === AuthMethod.BACKUP_CODE) {
    return 'backup-code';
  }
  if (authMethod === AuthMethod.TOTP) {
    return 'totp';
  }
  return 'email';
}

export function toAuditMfaMethodLimited(
  method: AuthMethod,
): Extract<AuditMfaMethod, 'totp' | 'email'> {
  if (method === AuthMethod.TOTP) {
    return 'totp';
  }
  return 'email';
}

export function toAuditRegisterMethod(
  method: AuthMethod | 'oauth',
): AuditRegisterMethod {
  if (method === AuthMethod.EMAIL) {
    return 'email';
  }
  return 'oauth';
}

export interface SecurityEventPayloadMap {
  // Auth login
  login_failed: {
    method: AuditAuthMethod;
    email?: string;
    error: string;
    attemptCount?: number;
  };
  login_success: {
    method: AuditAuthMethod;
    email: string;
    isNewDevice?: boolean;
    deviceFingerprint?: string;
  };

  // Logout & session
  logout: {
    method: AuditAuthMethod;
    email?: string;
    sessionId?: string;
  };
  logout_all_sessions: {
    method: AuditAuthMethod;
    revokedSessions: number;
  };

  // Password lifecycle
  password_changed: {
    changedBy: 'user' | 'admin';
    adminId?: string;
  };
  password_reset_requested: {
    email: string;
  };
  password_reset_completed: {
    email: string;
  };
  password_reset_failed: {
    email?: string;
    error: string;
  };

  // Registration & account state
  register_started: {
    method: AuditRegisterMethod;
    email: string;
  };
  register_completed: {
    method: AuditRegisterMethod;
    email: string;
  };
  register_failed: {
    method: AuditRegisterMethod;
    email?: string;
    error: string;
  };

  // MFA lifecycle
  mfa_enabled: {
    method: Extract<AuditMfaMethod, 'totp' | 'email'>;
  };
  mfa_disabled: {
    method: Extract<AuditMfaMethod, 'totp' | 'email'>;
    disabledBy: 'user' | 'admin';
    adminId?: string;
  };
  mfa_verified: {
    method: AuditMfaMethod;
  };
  mfa_failed: {
    method: AuditMfaMethod;
    error: string;
  };
  mfa_setup_started: {
    method: Extract<AuditMfaMethod, 'totp' | 'email'>;
    stage: 'request' | 'required_before_login';
  };
  mfa_setup_completed: {
    method: 'totp';
  };
  mfa_setup_failed: {
    method: Extract<AuditMfaMethod, 'totp' | 'email'>;
    error: string;
  };
  mfa_challenge_started: {
    method: Extract<AuditMfaMethod, 'totp' | 'email'>;
    metadata?: Record<string, unknown>;
  };

  // Account lockout
  account_locked: {
    reason:
      | 'brute_force'
      | 'suspicious_activity'
      | 'admin_action'
      | 'policy_violation';
    lockoutUntil: Date;
  };
  account_unlocked: {
    unlockedBy: 'admin' | 'system';
    adminId?: string;
  };

  // Security posture & monitoring
  suspicious_activity: {
    activity: string;
    details: Record<string, unknown>;
  };
  ip_changed: {
    previousIp: string;
    newIp: string;
  };
  device_changed: {
    previousDevice: string;
    newDevice: string;
  };
  permission_escalation: {
    previousPermissions: string[];
    newPermissions: string[];
  };

  // API key lifecycle
  api_key_created: {
    keyPrefix: string;
    name: string;
  };
  api_key_revoked: {
    keyPrefix: string;
    name: string;
    reason?: string;
  };
  api_key_usage_blocked: {
    apiKeyId?: string;
    reason: string;
  };

  // Data & bulk operations
  data_exported: {
    exportType: string;
    recordCount: number;
  };
  bulk_operation: {
    operation: string;
    entityType: string;
    recordCount: number;
  };

  // OTP
  otp_sent: {
    email: string;
    purpose: PurposeVerify;
  };
  otp_send_failed: {
    email?: string;
    purpose: PurposeVerify;
    error: string;
  };
  otp_invalid: {
    email?: string;
    purpose: PurposeVerify;
    error: string;
  };
  otp_rate_limited: {
    email?: string;
    purpose: PurposeVerify;
    limit: number;
  };

  // Rate limit
  rate_limit_exceeded: {
    routePath: string;
    identifier: string;
    count: number;
    limit: number;
  };
}

export type SecurityEventPayload<T extends SecurityEventType> =
  T extends keyof SecurityEventPayloadMap
    ? SecurityEventPayloadMap[T]
    : Record<string, unknown>;

export type SecurityEventPayloadBase<
  T extends SecurityEventType = SecurityEventType,
> = {
  category: 'security';
  eventType: T;
  severity: SecurityEventSeverity;
  metadata?: Record<string, unknown>;
  location?: {
    country?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  };
} & SecurityEventPayload<T>;
