import type { SecurityEventSeverity, SecurityEventType } from 'src/generated';

export interface SecurityEventPayloadMap {
  login_failed: {
    method: 'email' | 'oauth' | 'api_key';
    email?: string;
    error: string;
    attemptCount?: number;
  };
  login_success: {
    method: 'email' | 'oauth' | 'api_key';
    email: string;
    isNewDevice?: boolean;
    deviceFingerprint?: string;
  };
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
  mfa_enabled: {
    method: 'totp' | 'email';
  };
  mfa_disabled: {
    method: 'totp' | 'email';
    disabledBy: 'user' | 'admin';
    adminId?: string;
  };
  mfa_verified: {
    method: 'totp' | 'email' | 'backup-code';
  };
  mfa_failed: {
    method: 'totp' | 'email' | 'backup-code';
    error: string;
  };
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
  api_key_created: {
    keyPrefix: string;
    name: string;
  };
  api_key_revoked: {
    keyPrefix: string;
    name: string;
    reason?: string;
  };
  data_exported: {
    exportType: string;
    recordCount: number;
  };
  bulk_operation: {
    operation: string;
    entityType: string;
    recordCount: number;
  };
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
