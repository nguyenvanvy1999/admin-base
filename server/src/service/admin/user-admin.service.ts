import { db, type IDb } from 'src/config/db';
import {
  type Prisma,
  type UserSelect,
  UserStatus,
  type UserUncheckedUpdateInput,
} from 'src/generated';
import type {
  AdminUserActionResDto,
  AdminUserCreateDto,
  AdminUserDetailResDto,
  AdminUserListQueryDto,
  AdminUserMfaActionDto,
  AdminUserUpdateDto,
} from 'src/modules/admin/dtos';
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
  NotFoundErr,
  normalizeEmail,
} from 'src/share';

type UserActionResult = typeof AdminUserActionResDto.static;
type BaseUserActionParams = {
  targetUserId: string;
  actorId: string;
} & typeof AdminUserMfaActionDto.static;
type UpdateUserParams = BaseUserActionParams & typeof AdminUserUpdateDto.static;
type CreateUserParams = { actorId: string } & typeof AdminUserCreateDto.static;
type ListUsersParams = typeof AdminUserListQueryDto.static;

const baseUserSelect = {
  id: true,
  email: true,
  status: true,
  name: true,
  emailVerified: true,
  protected: true,
  created: true,
  roles: {
    select: { role: { select: { title: true, id: true } } },
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

export class AdminUserService {
  constructor(
    private readonly deps: {
      db: IDb;
      sessionService: SessionService;
      auditLogService: AuditLogService;
      passwordService: PasswordService;
      passwordValidationService: PasswordValidationService;
      userUtilService: UserUtilService;
    } = {
      db,
      sessionService,
      auditLogService,
      passwordService,
      passwordValidationService,
      userUtilService,
    },
  ) {}

  async createUser(params: CreateUserParams): Promise<UserActionResult> {
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
    const trimmedName = name && name.trim().length > 0 ? name.trim() : null;
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

  async listUsers(params: ListUsersParams) {
    const { take = 20, skip = 0, email, search, statuses, roleIds } = params;

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

    const normalizedRoleIds = this.normalizeRoleFilters(roleIds);
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

    return {
      docs,
      count,
    };
  }

  async getUserDetail(
    userId: string,
  ): Promise<typeof AdminUserDetailResDto.static> {
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

    return user;
  }

  async resetUserMfa(params: BaseUserActionParams): Promise<UserActionResult> {
    const { targetUserId, actorId, reason } = params;
    const normalizedReason = this.normalizeReason(reason);
    const user = await this.ensureUserExists(targetUserId);
    if (user.protected) {
      throw new BadReqErr(ErrCode.PermissionDenied);
    }

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
    if (user.protected) {
      throw new BadReqErr(ErrCode.PermissionDenied);
    }

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

  private normalizeRoleFilters(roleIds?: string[]): string[] {
    const result = new Set<string>();
    roleIds
      ?.map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => result.add(id));
    return Array.from(result);
  }
}

export const adminUserService = new AdminUserService();
