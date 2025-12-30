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

export const ReasonDto = t.Object({
  reason: DtoFields.reason,
});

export const ReasonRequiredDto = t.Object({
  reason: DtoFields.reasonRequired,
});

export const BaseUserDto = t.Object({
  id: t.String(),
  email: DtoFields.email, // using DtoFields.email which might include format: 'email'
  password: DtoFields.password,
  name: DtoFields.displayName,
  status: t.Enum(UserStatus),
  emailVerified: t.Boolean(),
  lockoutUntil: DtoFields.isoDateNullable,
  lockoutReason: t.Nullable(t.Enum(LockoutReason)),
  passwordAttempt: t.Integer({ minimum: 0, maximum: 100 }),
  passwordExpired: DtoFields.isoDateNullable,
  created: DtoFields.isoDate,
  modified: DtoFields.isoDate,
  protected: t.Boolean(),
});

export const AdminUserMfaActionDto = ReasonDto;

export const AdminUserUpdateRolesDto = t.Composite([
  ReasonRequiredDto,
  t.Object({
    roles: t.Array(userRoleAssignmentDto, { minItems: 0 }),
  }),
]);

export const AdminUserUpdateDto = t.Composite([
  ReasonDto,
  t.Partial(
    t.Pick(BaseUserDto, [
      'status',
      'name',
      'lockoutUntil',
      'lockoutReason',
      'emailVerified',
      'passwordAttempt',
      'passwordExpired',
    ]),
  ),
]);

export const AdminUserActionResDto = t.Object({
  userId: t.String(),
});

export const AdminUserCreateDto = t.Composite([
  t.Pick(BaseUserDto, ['email', 'password']),
  t.Partial(t.Pick(BaseUserDto, ['name', 'status', 'emailVerified'])),
  t.Object({
    roleIds: t.Optional(DtoFields.roleIds),
  }),
]);

export const AdminUserListQueryDto = t.Object({
  take: PaginationReqDto.properties.take,
  skip: PaginationReqDto.properties.skip,
  email: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 128,
    }),
  ),
  search: DtoFields.search,
  statuses: t.Optional(t.Array(t.Enum(UserStatus))),
  roleIds: t.Optional(t.Array(t.String())),
});

const SessionStatsDto = t.Object({
  total: t.Integer(),
  active: t.Integer(),
  revoked: t.Integer(),
  expired: t.Integer(),
});

const AdminUserSummaryDto = t.Composite([
  t.Pick(BaseUserDto, [
    'id',
    'status',
    'emailVerified',
    'created',
    'protected',
  ]),
  t.Object({
    email: t.String({ format: 'email' }), // Explicitly re-defining to ensure string format if needed, or could Pick if BaseUserDto.email matches exactly.
    name: DtoFields.displayName,
    roles: roleListDto,
    sessionStats: SessionStatsDto,
  }),
]);

export const AdminUserListResDto = PaginatedDto(AdminUserSummaryDto);

export const AdminUserDetailResDto = t.Intersect([
  AdminUserSummaryDto,
  t.Pick(BaseUserDto, [
    'modified',
    'lockoutUntil',
    'lockoutReason',
    'passwordAttempt',
    'passwordExpired',
  ]),
]);

export type AdminUserActionResult = typeof AdminUserActionResDto.static;

export type AdminUserMfaActionParams = typeof AdminUserMfaActionDto.static;
export type AdminUserUpdateParams = typeof AdminUserUpdateDto.static;
export type AdminUserCreateParams = typeof AdminUserCreateDto.static;
export type AdminUserListParams = typeof AdminUserListQueryDto.static;
export type AdminUserUpdateRolesParams = typeof AdminUserUpdateRolesDto.static;
export type AdminUserDetailResult = typeof AdminUserDetailResDto.static;
