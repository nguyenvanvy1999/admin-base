export type LogType = 'audit' | 'security' | 'system' | 'api' | 'rate_limit';

export type AuditLogCategory = 'cud' | 'security' | 'internal' | 'system';

export type AuditLogVisibility =
  | 'admin_only'
  | 'actor_only'
  | 'subject_only'
  | 'actor_and_subject'
  | 'public';

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityEventType =
  | 'login_failed'
  | 'login_success'
  | 'logout'
  | 'logout_all_sessions'
  | 'refresh_token_success'
  | 'refresh_token_failed'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'password_reset_failed'
  | 'register_started'
  | 'register_completed'
  | 'register_failed'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verified'
  | 'mfa_failed'
  | 'mfa_setup_started'
  | 'mfa_setup_completed'
  | 'mfa_setup_failed'
  | 'mfa_challenge_started'
  | 'account_locked'
  | 'account_unlocked'
  | 'suspicious_activity'
  | 'ip_changed'
  | 'device_changed'
  | 'permission_escalation'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'api_key_usage_blocked'
  | 'data_exported'
  | 'bulk_operation'
  | 'rate_limit_exceeded'
  | 'otp_sent'
  | 'otp_send_failed'
  | 'otp_invalid'
  | 'otp_rate_limited';

export interface AdminAuditLog {
  id: string;
  payload: Record<string, any>;
  description: string | null;
  level: string;
  logType: LogType;
  category: AuditLogCategory | null;
  visibility: AuditLogVisibility;

  userId: string | null;
  subjectUserId: string | null;
  sessionId: string | null;

  entityType: string | null;
  entityId: string | null;
  entityDisplay: Record<string, unknown> | null;

  eventType: SecurityEventType | null;
  severity: SecurityEventSeverity | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;

  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  traceId: string | null;
  correlationId: string | null;

  occurredAt: string;
  created: string;
}

export interface AdminAuditLogListQuery {
  skip?: number;
  take?: number;
  userId?: string;
  sessionId?: string;
  entityType?: string;
  entityId?: string;
  level?: string;
  logType?: LogType;
  category?: AuditLogCategory;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  resolved?: boolean;
  subjectUserId?: string;
  ip?: string;
  traceId?: string;
  correlationId?: string;
  occurredAt0?: string;
  occurredAt1?: string;
}

export interface AdminAuditLogListResponse {
  docs: AdminAuditLog[];
  count: number;
}

export type UserAuditLog = AdminAuditLog;
export type UserAuditLogListQuery = AdminAuditLogListQuery;
export type UserAuditLogListResponse = AdminAuditLogListResponse;
