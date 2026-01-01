import type {
  AuditLogVisibility,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/generated';
import type { AuthMethod } from 'src/services/auth/types/constants';

type SecurityEventData = {
  category: 'security';
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  method?: AuthMethod | string;
  email?: string;
  error?: string;
  [key: string]: any;
};

type AuditLogContext = {
  subjectUserId?: string;
  userId?: string;
  sessionId?: string;
  visibility?: AuditLogVisibility;
};

export function createSecurityAuditLog(
  eventType: SecurityEventType,
  severity: SecurityEventSeverity,
  method: AuthMethod | string,
  user: { id: string; email: string | null },
  options?: {
    error?: string;
    isNewDevice?: boolean;
    changedBy?: string;
    disabledBy?: string;
    stage?: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  },
): SecurityEventData {
  return {
    category: 'security',
    eventType,
    severity,
    method,
    email: user.email ?? '',
    ...options,
  };
}

export function createAuditContext(
  userId: string,
  options?: {
    sessionId?: string;
    visibility?: AuditLogVisibility;
  },
): AuditLogContext {
  return {
    subjectUserId: userId,
    userId,
    ...options,
  };
}
