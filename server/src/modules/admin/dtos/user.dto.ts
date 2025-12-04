import { t } from 'elysia';
import { LockoutReason, UserStatus } from 'src/generated';
import { DtoFields, PaginatedDto, PaginationReqDto } from 'src/share';

const roleListDto = t.Array(
  t.Object({
    role: t.Object({
      title: t.String(),
      id: t.String(),
    }),
    expiresAt: DtoFields.isoDateNullable,
  }),
);

const userRoleAssignmentDto = t.Object({
  roleId: t.String({ minLength: 1 }),
  expiresAt: DtoFields.isoDateNullable,
});

export const AdminUserMfaActionDto = t.Object({
  reason: DtoFields.reason,
});

export const AdminUserUpdateRolesDto = t.Object({
  roles: t.Array(userRoleAssignmentDto, { minItems: 0 }),
  reason: DtoFields.reasonRequired,
});

export const AdminUserUpdateDto = t.Object({
  status: t.Optional(t.Enum(UserStatus)),
  name: t.Optional(DtoFields.displayName),
  lockoutUntil: t.Optional(DtoFields.isoDateNullable),
  lockoutReason: t.Optional(t.Nullable(t.Enum(LockoutReason))),
  emailVerified: t.Optional(t.Boolean()),
  passwordAttempt: t.Optional(
    t.Integer({
      minimum: 0,
      maximum: 100,
    }),
  ),
  passwordExpired: t.Optional(DtoFields.isoDateNullable),
  reason: DtoFields.reason,
});

export const AdminUserActionResDto = t.Object({
  userId: t.String(),
  auditLogId: t.String(),
});

export const AdminUserCreateDto = t.Object({
  email: DtoFields.email,
  password: DtoFields.password,
  name: t.Optional(DtoFields.displayName),
  roleIds: t.Optional(DtoFields.roleIds),
  status: t.Optional(t.Enum(UserStatus)),
  emailVerified: t.Optional(t.Boolean()),
});

export const AdminUserListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    email: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 128,
      }),
    ),
    search: DtoFields.search,
    statuses: t.Optional(
      t.Array(t.Enum(UserStatus), {
        minItems: 1,
        maxItems: 25,
      }),
    ),
    roleIds: t.Optional(
      t.Array(t.String(), {
        minItems: 1,
        maxItems: 25,
      }),
    ),
  }),
]);

const SessionStatsDto = t.Object({
  total: t.Integer(),
  active: t.Integer(),
  revoked: t.Integer(),
  expired: t.Integer(),
});

const AdminUserSummaryDto = t.Object({
  id: t.String(),
  email: t.String({ format: 'email' }),
  status: t.Enum(UserStatus),
  name: DtoFields.displayName,
  created: DtoFields.isoDate,
  emailVerified: t.Boolean(),
  roles: roleListDto,
  protected: t.Boolean(),
  sessionStats: SessionStatsDto,
});

export const AdminUserListResDto = PaginatedDto(AdminUserSummaryDto);

export const AdminUserDetailResDto = t.Intersect([
  AdminUserSummaryDto,
  t.Object({
    modified: DtoFields.isoDate,
    lockoutUntil: DtoFields.isoDateNullable,
    lockoutReason: t.Nullable(t.Enum(LockoutReason)),
    passwordAttempt: t.Integer(),
    passwordExpired: DtoFields.isoDateNullable,
  }),
]);
