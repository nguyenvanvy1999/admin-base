import type { SecurityEventSeverity, SecurityEventType } from 'src/generated';

export function inferSeverityFromEventType(
  eventType: SecurityEventType,
): SecurityEventSeverity {
  switch (eventType) {
    case 'login_success':
    case 'mfa_enabled':
    case 'mfa_verified':
    case 'password_reset_completed':
    case 'account_unlocked':
      return 'low';

    case 'login_failed':
    case 'password_changed':
    case 'password_reset_requested':
    case 'mfa_disabled':
    case 'mfa_failed':
    case 'ip_changed':
    case 'device_changed':
    case 'api_key_created':
      return 'medium';

    case 'account_locked':
    case 'suspicious_activity':
    case 'permission_escalation':
    case 'api_key_revoked':
    case 'data_exported':
      return 'high';

    case 'bulk_operation':
      return 'critical';

    default:
      return 'medium';
  }
}

export function shouldAutoResolve(eventType: SecurityEventType): boolean {
  switch (eventType) {
    case 'login_success':
    case 'password_changed':
    case 'mfa_enabled':
    case 'mfa_verified':
    case 'password_reset_completed':
    case 'account_unlocked':
    case 'api_key_created':
      return true;

    default:
      return false;
  }
}

export function getSecurityEventDescription(
  eventType: SecurityEventType,
  metadata?: Record<string, any> | null,
): string {
  const meta = metadata || {};

  switch (eventType) {
    case 'login_failed':
      return `Login failed${meta.method ? ` via ${meta.method}` : ''}${meta.reason ? `: ${meta.reason}` : ''}`;

    case 'login_success':
      return `Login successful${meta.method ? ` via ${meta.method}` : ''}${meta.isNewDevice ? ' (new device)' : ''}`;

    case 'password_changed':
      return 'Password changed';

    case 'password_reset_requested':
      return 'Password reset requested';

    case 'password_reset_completed':
      return 'Password reset completed';

    case 'mfa_enabled':
      return `MFA enabled${meta.method ? ` via ${meta.method}` : ''}`;

    case 'mfa_disabled':
      return `MFA disabled${meta.method ? ` via ${meta.method}` : ''}`;

    case 'mfa_verified':
      return `MFA verified${meta.method ? ` via ${meta.method}` : ''}`;

    case 'mfa_failed':
      return `MFA verification failed${meta.method ? ` via ${meta.method}` : ''}${meta.reason ? `: ${meta.reason}` : ''}`;

    case 'account_locked':
      return `Account locked${meta.reason ? `: ${meta.reason}` : ''}`;

    case 'account_unlocked':
      return `Account unlocked${meta.reason ? `: ${meta.reason}` : ''}`;

    case 'suspicious_activity':
      return `Suspicious activity detected${meta.reason ? `: ${meta.reason}` : ''}`;

    case 'ip_changed':
      return `IP address changed${meta.oldIp && meta.newIp ? ` from ${meta.oldIp} to ${meta.newIp}` : ''}`;

    case 'device_changed':
      return `Device changed${meta.deviceFingerprint ? ` (fingerprint: ${meta.deviceFingerprint})` : ''}`;

    case 'permission_escalation':
      return `Permission escalation detected${meta.roleId ? ` (role: ${meta.roleId})` : ''}`;

    case 'api_key_created':
      return `API key created${meta.keyName ? `: ${meta.keyName}` : ''}`;

    case 'api_key_revoked':
      return `API key revoked${meta.keyName ? `: ${meta.keyName}` : ''}`;

    case 'data_exported':
      return `Data exported${meta.exportType ? `: ${meta.exportType}` : ''}`;

    case 'bulk_operation':
      return `Bulk operation performed${meta.operation ? `: ${meta.operation}` : ''}${meta.count ? ` (${meta.count} items)` : ''}`;

    default:
      return `Security event: ${eventType}`;
  }
}
