import { db, type IDb } from 'src/config/db';
import { UserStatus, type UserUncheckedUpdateInput } from 'src/generated';
import type {
  AdminUserActionResDto,
  AdminUserMfaActionDto,
  AdminUserUpdateDto,
} from 'src/modules/admin/dtos';
import {
  type SessionService,
  sessionService,
} from 'src/service/auth/session.service';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import { ACTIVITY_TYPE, ErrCode, NotFoundErr } from 'src/share';

type UserActionResult = typeof AdminUserActionResDto.static;
type BaseUserActionParams = {
  targetUserId: string;
  actorId: string;
} & typeof AdminUserMfaActionDto.static;
type UpdateUserParams = BaseUserActionParams & typeof AdminUserUpdateDto.static;

const updateUserSelect = {
  id: true,
  status: true,
  name: true,
  lockoutUntil: true,
  lockoutReason: true,
  emailVerified: true,
  passwordAttempt: true,
  passwordExpired: true,
  roles: { select: { roleId: true } },
} as const;

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
    });

    return { userId: targetUserId, auditLogId };
  }

  async updateUser(
    params: UpdateUserParams,
  ): Promise<typeof AdminUserActionResDto.static> {
    const {
      targetUserId,
      actorId,
      status,
      name,
      roleIds,
      lockoutUntil,
      lockoutReason,
      emailVerified,
      passwordAttempt,
      passwordExpired,
      reason,
    } = params;
    const normalizedReason = this.normalizeReason(reason);

    const existingUser = await this.deps.db.user.findUnique({
      where: { id: targetUserId },
      select: updateUserSelect,
    });
    if (!existingUser) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    type UserSnapshot = typeof existingUser;
    type AssignableField = Exclude<
      keyof UserSnapshot,
      'id' | 'roles' | 'status'
    >;

    const updateData: Record<string, unknown> = {};
    let hasScalarUpdate = false;
    const auditChanges: Record<string, { previous: unknown; next: unknown }> =
      {};

    if (status !== undefined) {
      auditChanges.status = {
        previous: existingUser.status,
        next: status,
      };
      if (status !== existingUser.status) {
        updateData.status = status;
        hasScalarUpdate = true;
      }
    }

    const assignIfProvided = <K extends AssignableField>(
      field: K,
      nextValue: UserSnapshot[K] | null | undefined,
    ) => {
      if (nextValue === undefined) {
        return;
      }
      auditChanges[field as string] = {
        previous: existingUser[field],
        next: nextValue,
      };
      if (nextValue !== existingUser[field]) {
        updateData[field as string] = nextValue as never;
        hasScalarUpdate = true;
      }
    };

    assignIfProvided('name', name);
    assignIfProvided('lockoutUntil', lockoutUntil);
    assignIfProvided('lockoutReason', lockoutReason);
    assignIfProvided('emailVerified', emailVerified);
    assignIfProvided('passwordAttempt', passwordAttempt);
    assignIfProvided('passwordExpired', passwordExpired);

    let normalizedRoleIds: string[] | undefined;
    if (roleIds !== undefined) {
      normalizedRoleIds = Array.from(new Set(roleIds));
      const previousRoleIds = existingUser.roles.map((role) => role.roleId);
      auditChanges.roleIds = {
        previous: previousRoleIds,
        next: normalizedRoleIds,
      };
      const rolesToRemove = previousRoleIds.filter(
        (roleId) => !normalizedRoleIds?.includes(roleId),
      );
      if (rolesToRemove.length > 0) {
        await this.deps.db.rolePlayer.deleteMany({
          where: {
            playerId: targetUserId,
            roleId: { in: rolesToRemove },
          },
        });
      }
      const rolesToAdd = normalizedRoleIds.filter(
        (roleId) => !previousRoleIds.includes(roleId),
      );
      if (rolesToAdd.length > 0) {
        await this.deps.db.rolePlayer.createMany({
          data: rolesToAdd.map((roleId) => ({
            id: crypto.randomUUID(),
            roleId,
            playerId: targetUserId,
          })),
          skipDuplicates: true,
        });
      }
    }

    if (hasScalarUpdate) {
      await this.deps.db.user.update({
        where: { id: targetUserId },
        data: updateData as UserUncheckedUpdateInput,
        select: { id: true },
      });
    }

    const shouldRevokeSessions =
      status !== undefined &&
      status !== existingUser.status &&
      status !== UserStatus.active;

    if (shouldRevokeSessions) {
      await this.deps.sessionService.revoke(targetUserId);
    }

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.UPDATE_USER,
      payload: {
        id: targetUserId,
        reason: normalizedReason,
        actorId,
        action: 'user-update',
        changes: auditChanges,
      },
    });

    return {
      userId: targetUserId,
      auditLogId,
    };
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
