import { db, type IDb } from 'src/config/db';
import { UserStatus } from 'src/generated';
import {
  type SessionService,
  sessionService,
} from 'src/service/auth/session.service';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import { ACTIVITY_TYPE, ErrCode, NotFoundErr } from 'src/share';

type BaseUserActionParams = {
  targetUserId: string;
  actorId: string;
  reason?: string;
};

type UpdateStatusParams = BaseUserActionParams & {
  status: UserStatus;
};

type UserActionResult = {
  userId: string;
  auditLogId: string;
};

type UserStatusResult = UserActionResult & {
  status: UserStatus;
};

export class AdminUserService {
  constructor(
    private readonly deps: {
      db: IDb;
      sessionService: SessionService;
      auditLogService: AuditLogService;
    } = {
      db,
      sessionService,
      auditLogService,
    },
  ) {}

  async resetUserMfa(params: BaseUserActionParams): Promise<UserActionResult> {
    const { targetUserId, actorId, reason } = params;
    const normalizedReason = this.normalizeReason(reason);
    const user = await this.ensureUserExists(targetUserId);

    await this.resetMfaState(targetUserId);

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.RESET_MFA,
      payload: {
        method: 'admin-reset',
        reason: normalizedReason,
        actorId,
        targetUserId,
        previouslyEnabled: user.mfaTotpEnabled ?? false,
      },
      userId: actorId,
    });

    return { userId: targetUserId, auditLogId };
  }

  async disableUserMfa(
    params: BaseUserActionParams,
  ): Promise<UserActionResult> {
    const { targetUserId, actorId, reason } = params;
    const normalizedReason = this.normalizeReason(reason);
    const user = await this.ensureUserExists(targetUserId);

    await this.resetMfaState(targetUserId);

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.RESET_MFA,
      payload: {
        method: 'admin-disable',
        reason: normalizedReason,
        actorId,
        targetUserId,
        previouslyEnabled: user.mfaTotpEnabled ?? false,
      },
      userId: actorId,
    });

    return { userId: targetUserId, auditLogId };
  }

  async updateUserStatus(
    params: UpdateStatusParams,
  ): Promise<UserStatusResult> {
    const { targetUserId, actorId, status, reason } = params;
    const normalizedReason = this.normalizeReason(reason);
    const user = await this.ensureUserExists(targetUserId);

    if (user.status === status) {
      const auditLogId = await this.deps.auditLogService.push({
        type: ACTIVITY_TYPE.UPDATE_USER,
        payload: {
          id: targetUserId,
          status,
          previousStatus: user.status,
          reason: normalizedReason,
          actorId,
          action: 'status-update',
        },
        userId: actorId,
      });
      return { userId: targetUserId, status, auditLogId };
    }

    await this.deps.db.user.update({
      where: { id: targetUserId },
      data: { status },
      select: { id: true },
    });

    if (status !== UserStatus.active) {
      await this.deps.sessionService.revoke(targetUserId);
    }

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.UPDATE_USER,
      payload: {
        id: targetUserId,
        status,
        previousStatus: user.status,
        reason: normalizedReason,
        actorId,
        action: 'status-update',
      },
      userId: actorId,
    });

    return { userId: targetUserId, status, auditLogId };
  }

  private async ensureUserExists(userId: string): Promise<{
    id: string;
    status: UserStatus;
    mfaTotpEnabled: boolean | null;
  }> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        mfaTotpEnabled: true,
      },
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    return user;
  }

  private async resetMfaState(userId: string): Promise<void> {
    await this.deps.db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        mfaTotpEnabled: false,
        backupCodes: null,
        backupCodesUsed: null,
      },
      select: { id: true },
    });

    await this.deps.sessionService.revoke(userId);
  }

  private normalizeReason(reason?: string) {
    if (!reason) {
      return undefined;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.slice(0, 512);
  }
}

export const adminUserService = new AdminUserService();
