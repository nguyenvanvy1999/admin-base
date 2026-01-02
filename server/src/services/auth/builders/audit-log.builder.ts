import {
  type AuditLogVisibility,
  SecurityEventSeverity,
  SecurityEventType,
} from 'src/generated';
import { AuthMethod } from 'src/services/auth/types/constants';
import {
  createAuditContext,
  createSecurityAuditLog,
} from '../utils/auth-audit.util';

type UserForAudit = { id: string; email: string | null };

export class AuditLogBuilder {
  buildLoginSuccess(
    user: UserForAudit,
    method: AuthMethod,
    sessionId?: string,
    metadata?: Record<string, any>,
  ) {
    return createSecurityAuditLog(
      SecurityEventType.login_success,
      SecurityEventSeverity.low,
      method,
      user,
      metadata,
    );
  }

  buildLoginFailed(
    user: UserForAudit,
    method: AuthMethod,
    error: string,
    severity: SecurityEventSeverity = SecurityEventSeverity.medium,
  ) {
    return createSecurityAuditLog(
      SecurityEventType.login_failed,
      severity,
      method,
      user,
      { error },
    );
  }

  buildMfaVerified(user: UserForAudit, method: AuthMethod, sessionId?: string) {
    return createSecurityAuditLog(
      SecurityEventType.mfa_verified,
      SecurityEventSeverity.low,
      method,
      user,
    );
  }

  buildMfaFailed(user: UserForAudit, method: AuthMethod, error: string) {
    return createSecurityAuditLog(
      SecurityEventType.mfa_failed,
      SecurityEventSeverity.medium,
      method,
      user,
      { error },
    );
  }

  buildMfaChallengeStarted(user: UserForAudit, metadata?: Record<string, any>) {
    return createSecurityAuditLog(
      SecurityEventType.mfa_challenge_started,
      SecurityEventSeverity.low,
      AuthMethod.EMAIL,
      user,
      { metadata },
    );
  }

  buildAuditContext(
    userId: string,
    options?: {
      sessionId?: string;
      visibility?: AuditLogVisibility;
    },
  ) {
    return createAuditContext(userId, options);
  }
}
