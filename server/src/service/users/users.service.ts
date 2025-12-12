import { db, type IDb } from 'src/config/db';
import type {
  AdminUserActionResult,
  AdminUserCreateParams,
  AdminUserDetailResult,
  AdminUserListParams,
  AdminUserMfaActionParams,
  AdminUserUpdateParams,
  AdminUserUpdateRolesParams,
} from 'src/dtos/users.dto';
import {
  type Prisma,
  type UserSelect,
  UserStatus,
  type UserUncheckedUpdateInput,
} from 'src/generated';
import {
  type UserUtilService,
  userUtilService,
} from 'src/service/auth/auth-util.service';
import {
  type PasswordService,
  passwordService,
} from 'src/service/auth/password.service';
import {
  type PasswordValidationService,
  passwordValidationService,
} from 'src/service/auth/password-validation.service';
import {
  type SessionService,
  sessionService,
} from 'src/service/auth/session.service';
import {
  type AuditLogService,
  auditLogService,
} from 'src/service/misc/audit-log.service';
import {
  ACTIVITY_TYPE,
  BadReqErr,
  DB_PREFIX,
  defaultRoles,
  ErrCode,
  IdUtil,
  type MfaMethod,
  NotFoundErr,
  normalizeEmail,
  ServiceUtils,
} from 'src/share';

type BaseUserActionParams = {
  targetUserId: string;
  actorId: string;
} & AdminUserMfaActionParams;
type UpdateUserParams = BaseUserActionParams & AdminUserUpdateParams;
type CreateUserParams = { actorId: string } & AdminUserCreateParams;
type UpdateUserRolesParams = {
  targetUserId: string;
  actorId: string;
} & AdminUserUpdateRolesParams;

const baseUserSelect = {
  id: true,
  email: true,
  status: true,
  name: true,
  emailVerified: true,
  protected: true,
  created: true,
  roles: {
    select: { role: { select: { title: true, id: true } }, expiresAt: true },
  },
} satisfies UserSelect;

const updateUserSelect = {
  ...baseUserSelect,
  lockoutUntil: true,
  lockoutReason: true,
  passwordAttempt: true,
  passwordExpired: true,
  roles: { select: { roleId: true } },
} satisfies UserSelect;

export class UsersService {
  constructor(
    private readonly deps: {
      db: IDb;
      sessionService: SessionService;
      auditLogService: AuditLogService;
      passwordService: PasswordService;
      passwordValidationService: PasswordValidationService;
      userUtilService: UserUtilService;
    },
  ) {}

  async createUser(params: CreateUserParams): Promise<AdminUserActionResult> {
    const { actorId, email, password, name, roleIds, status, emailVerified } =
      params;

    this.deps.passwordValidationService.validatePasswordOrThrow(password);
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await this.deps.db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadReqErr(ErrCode.UserExisted);
    }

    const resolvedRoleIds = await this.resolveRoleIds(roleIds);
    const userId = IdUtil.dbId(DB_PREFIX.USER);
    const trimmedName = ServiceUtils.trimOrNull(name);
    const nextStatus = status ?? UserStatus.active;
    const shouldVerifyEmail = emailVerified ?? nextStatus === UserStatus.active;

    await this.deps.db.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          name: trimmedName,
          status: nextStatus,
          emailVerified: shouldVerifyEmail,
          ...(await this.deps.passwordService.createPassword(password)),
          roles: {
            create: resolvedRoleIds.map((roleId) => ({
              id: IdUtil.dbId(),
              roleId,
            })),
          },
        },
        select: { id: true },
      });
    });

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.CREATE_USER,
      payload: {
        id: userId,
        enabled: nextStatus === UserStatus.active,
        roleIds: resolvedRoleIds,
        username: normalizedEmail,
      },
      userId: actorId,
    });

    return {
      userId,
      auditLogId,
    };
  }

  async listUsers(params: AdminUserListParams) {
    const { take, skip, email, search, statuses, roleIds } = params;

    const whereClauses: Prisma.UserWhereInput[] = [];
    if (email) {
      whereClauses.push({
        email: {
          contains: email.trim(),
          mode: 'insensitive',
        },
      });
    }

    if (search) {
      const normalizedSearch = search.trim();
      if (normalizedSearch) {
        whereClauses.push({
          OR: [
            {
              email: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          ],
        });
      }
    }

    if (Array.isArray(statuses) && statuses.length > 0) {
      whereClauses.push({
        status: { in: statuses },
      });
    }

    const normalizedRoleIds = ServiceUtils.normalizeStringArray(roleIds);
    if (normalizedRoleIds.length > 0) {
      whereClauses.push({
        roles: { some: { roleId: { in: normalizedRoleIds } } },
      });
    }

    const where = whereClauses.length > 0 ? { AND: whereClauses } : undefined;

    const [docs, count] = await this.deps.db.$transaction([
      this.deps.db.user.findMany({
        where,
        select: baseUserSelect,
        skip,
        take,
        orderBy: { created: 'desc' },
      }),
      this.deps.db.user.count({ where }),
    ]);

    const userIds = docs.map((doc) => doc.id);
    const sessionStatsMap = await this.getSessionStatsForUsers(userIds);

    const docsWithStats = docs.map((doc) => ({
      ...doc,
      sessionStats: sessionStatsMap.get(doc.id) ?? {
        total: 0,
        active: 0,
        revoked: 0,
        expired: 0,
      },
    }));

    return {
      docs: docsWithStats,
      count,
    };
  }

  async getUserDetail(userId: string): Promise<AdminUserDetailResult> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        ...baseUserSelect,
        modified: true,
        lockoutUntil: true,
        lockoutReason: true,
        passwordAttempt: true,
        passwordExpired: true,
      },
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    const sessionStatsMap = await this.getSessionStatsForUsers([userId]);
    const sessionStats = sessionStatsMap.get(userId) ?? {
      total: 0,
      active: 0,
      revoked: 0,
      expired: 0,
    };

    return {
      ...user,
      sessionStats,
    };
  }

  resetUserMfa(params: BaseUserActionParams): Promise<AdminUserActionResult> {
    return this.performMfaReset(params, 'admin-reset');
  }

  disableUserMfa(params: BaseUserActionParams): Promise<AdminUserActionResult> {
    return this.performMfaReset(params, 'admin-disable');
  }

  private async performMfaReset(
    params: BaseUserActionParams,
    method: MfaMethod,
  ): Promise<AdminUserActionResult> {
    const { targetUserId, actorId, reason } = params;
    const normalizedReason = ServiceUtils.normalizeReason(reason);
    const user = await this.ensureUserExists(targetUserId);
    if (user.protected) {
      throw new BadReqErr(ErrCode.PermissionDenied);
    }

    await this.resetMfaState(targetUserId);

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.RESET_MFA,
      payload: {
        method,
        reason: normalizedReason,
        actorId,
        targetUserId,
        previouslyEnabled: user.mfaTotpEnabled ?? false,
      },
    });

    return { userId: targetUserId, auditLogId };
  }

  async updateUser(params: UpdateUserParams): Promise<AdminUserActionResult> {
    const {
      targetUserId,
      actorId,
      status,
      name,
      lockoutUntil,
      lockoutReason,
      emailVerified,
      passwordAttempt,
      passwordExpired,
      reason,
    } = params;
    const normalizedReason = ServiceUtils.normalizeReason(reason);

    const existingUser = await this.deps.db.user.findUnique({
      where: { id: targetUserId },
      select: updateUserSelect,
    });
    if (!existingUser) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }
    if (existingUser.protected) {
      throw new BadReqErr(ErrCode.PermissionDenied);
    }

    type UserSnapshot = typeof existingUser;
    type AssignableField = Exclude<
      keyof UserSnapshot,
      'id' | 'roles' | 'status' | 'protected'
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

  async updateUserRoles(
    params: UpdateUserRolesParams,
  ): Promise<AdminUserActionResult> {
    const { targetUserId, actorId, roles, reason } = params;
    const normalizedReason = ServiceUtils.normalizeReason(reason);

    if (!normalizedReason) {
      throw new BadReqErr(ErrCode.BadRequest, {
        errors: 'Reason is required when updating user roles',
      });
    }

    const targetUser = await this.deps.db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, protected: true },
    });

    if (!targetUser) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    if (targetUser.protected) {
      throw new BadReqErr(ErrCode.PermissionDenied);
    }

    const uniqueRoleIds = Array.from(new Set(roles.map((role) => role.roleId)));

    if (uniqueRoleIds.length > 0) {
      const existingRoles = await this.deps.db.role.findMany({
        where: { id: { in: uniqueRoleIds } },
        select: { id: true },
      });

      if (existingRoles.length !== uniqueRoleIds.length) {
        throw new BadReqErr(ErrCode.ItemNotFound, {
          errors: 'One or more roles were not found',
        });
      }
    }

    const previousRoleAssignments = await this.deps.db.rolePlayer.findMany({
      where: { playerId: targetUserId },
      select: { roleId: true, expiresAt: true },
    });

    await this.deps.db.$transaction(async (tx) => {
      await tx.rolePlayer.deleteMany({
        where: { playerId: targetUserId },
      });

      if (roles.length > 0) {
        await tx.rolePlayer.createMany({
          data: roles.map((role) => ({
            id: IdUtil.dbId(),
            playerId: targetUserId,
            roleId: role.roleId,
            expiresAt: role.expiresAt ?? null,
          })),
          skipDuplicates: true,
        });
      }
    });

    const auditLogId = await this.deps.auditLogService.push({
      type: ACTIVITY_TYPE.UPDATE_USER,
      payload: {
        id: targetUserId,
        reason: normalizedReason,
        actorId,
        action: 'user-update-roles',
        changes: {
          roles: {
            previous: previousRoleAssignments.map((assignment) => ({
              roleId: assignment.roleId,
              expiresAt: assignment.expiresAt,
            })),
            next: roles.map((role) => ({
              roleId: role.roleId,
              expiresAt: role.expiresAt,
            })),
          },
        },
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
    protected: boolean;
  }> {
    const user = await this.deps.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        mfaTotpEnabled: true,
        protected: true,
      },
    });

    if (!user) {
      throw new NotFoundErr(ErrCode.UserNotFound);
    }

    return user;
  }

  private async resolveRoleIds(roleIds?: string[]): Promise<string[]> {
    if (!roleIds || roleIds.length === 0) {
      return [defaultRoles.user.id];
    }
    const uniqueRoleIds = Array.from(new Set(roleIds));
    const existing = await this.deps.db.role.findMany({
      where: { id: { in: uniqueRoleIds } },
      select: { id: true },
    });
    if (existing.length !== uniqueRoleIds.length) {
      throw new BadReqErr(ErrCode.ItemNotFound, {
        errors: 'One or more roles were not found',
      });
    }
    return uniqueRoleIds;
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

  private async getSessionStatsForUsers(
    userIds: string[],
  ): Promise<
    Map<
      string,
      { total: number; active: number; revoked: number; expired: number }
    >
  > {
    if (userIds.length === 0) {
      return new Map();
    }

    const now = new Date();
    const statsMap = new Map<
      string,
      { total: number; active: number; revoked: number; expired: number }
    >();

    userIds.forEach((id) =>
      statsMap.set(id, { total: 0, active: 0, revoked: 0, expired: 0 }),
    );

    const [totalStats, revokedStats, expiredStats] = await Promise.all([
      this.deps.db.session.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds } },
        _count: true,
      }),
      this.deps.db.session.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds }, revoked: true },
        _count: true,
      }),
      this.deps.db.session.groupBy({
        by: ['createdById'],
        where: {
          createdById: { in: userIds },
          revoked: false,
          expired: { lt: now },
        },
        _count: true,
      }),
    ]);

    const updateStat = (
      stats: typeof totalStats,
      key: 'total' | 'revoked' | 'expired',
    ) => {
      stats.forEach(({ createdById, _count }) => {
        const userStats = statsMap.get(createdById);
        if (userStats) userStats[key] = _count;
      });
    };

    updateStat(totalStats, 'total');
    updateStat(revokedStats, 'revoked');
    updateStat(expiredStats, 'expired');

    for (const stats of statsMap.values()) {
      stats.active = stats.total - stats.revoked - stats.expired;
    }

    return statsMap;
  }
}

export const usersService = new UsersService({
  db,
  sessionService,
  auditLogService,
  passwordService,
  passwordValidationService,
  userUtilService,
});
