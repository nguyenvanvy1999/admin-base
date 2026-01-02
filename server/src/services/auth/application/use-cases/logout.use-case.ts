import type { LogoutParams } from 'src/dtos/auth.dto';
import { buildDeleteChanges } from 'src/services/audit-logs/audit-logs.utils';
import type { IAuditLogService } from '../../domain/interfaces/audit-log.service.interface';
import type { ISessionService } from '../../domain/interfaces/session.service.interface';
import { AuthMethod } from '../../types/constants';
import { buildLogoutAuditLog } from '../../utils/auth-audit.helper';

export class LogoutUseCase {
  constructor(
    private readonly deps: {
      sessionService: ISessionService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: LogoutParams): Promise<void> {
    const { id, sessionId } = params;

    await this.deps.auditLogService.pushSecurity(
      buildLogoutAuditLog({ id, email: null }, AuthMethod.EMAIL, {
        userId: id,
        sessionId,
      }),
      { userId: id, sessionId: sessionId ?? null, subjectUserId: id },
    );

    await this.deps.sessionService.revoke(id, [sessionId]);
  }
}

export class LogoutAllUseCase {
  constructor(
    private readonly deps: {
      sessionService: ISessionService;
      auditLogService: IAuditLogService;
    },
  ) {}

  async execute(params: LogoutParams): Promise<void> {
    const { id, sessionId } = params;

    const changes = buildDeleteChanges({ sessionId });
    await this.deps.auditLogService.pushCud({
      category: 'cud',
      entityType: 'session',
      entityId: sessionId,
      action: 'delete',
      changes,
    });

    await this.deps.sessionService.revoke(id);
  }
}
