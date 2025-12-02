import { t } from 'elysia';
import { LockoutReason, UserStatus } from 'src/generated';
import { PaginatedDto, PaginationReqDto } from 'src/share';

const reasonField = t.Optional(
  t.String({
    minLength: 1,
    maxLength: 512,
    description: 'Optional reason that will be recorded in the audit log.',
  }),
);

const displayNameField = t.Nullable(
  t.String({
    minLength: 1,
    maxLength: 128,
    description: 'Display name shown inside the admin tools.',
  }),
);

const roleIdsField = t.Array(t.String({ minLength: 1 }), {
  minItems: 0,
  description: 'Complete list of role ids that should belong to the user.',
});

const isoDateField = t.Date({ format: 'date-time' });

const roleListDto = t.Array(
  t.Object({
    role: t.Object({
      title: t.String(),
      id: t.String(),
    }),
  }),
);

export const AdminUserMfaActionDto = t.Object({
  reason: reasonField,
});

export const AdminUserUpdateDto = t.Object({
  status: t.Optional(
    t.Enum(UserStatus, {
      description: 'Target status that will be applied to the user account.',
    }),
  ),
  name: t.Optional(displayNameField),
  roleIds: t.Optional(roleIdsField),
  lockoutUntil: t.Optional(
    t.Nullable(
      t.Date({
        format: 'date-time',
        description: 'Lockout expiration timestamp.',
      }),
    ),
  ),
  lockoutReason: t.Optional(
    t.Nullable(
      t.Enum(LockoutReason, {
        description: 'Reason why the user was locked out.',
      }),
    ),
  ),
  emailVerified: t.Optional(
    t.Boolean({
      description: 'Overwrite email verification flag.',
    }),
  ),
  passwordAttempt: t.Optional(
    t.Integer({
      minimum: 0,
      maximum: 100,
      description: 'Number of failed password attempts.',
    }),
  ),
  passwordExpired: t.Optional(
    t.Nullable(
      t.Date({
        format: 'date-time',
        description: 'Expiration timestamp for the current password.',
      }),
    ),
  ),
  reason: reasonField,
});

export const AdminUserActionResDto = t.Object({
  userId: t.String(),
  auditLogId: t.String(),
});

export const AdminUserCreateDto = t.Object({
  email: t.String({
    format: 'email',
    minLength: 5,
    maxLength: 128,
    description: 'Unique email used for login.',
  }),
  password: t.String({
    minLength: 8,
    maxLength: 128,
    description: 'Initial password that satisfies password policy.',
  }),
  name: t.Optional(displayNameField),
  roleIds: t.Optional(roleIdsField),
  status: t.Optional(
    t.Enum(UserStatus, {
      description: 'Initial status for the created account.',
    }),
  ),
  emailVerified: t.Optional(
    t.Boolean({
      description: 'Overwrite email verification flag.',
    }),
  ),
});

export const AdminUserListQueryDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    email: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 128,
        description: 'Filter by partial email match.',
      }),
    ),
    search: t.Optional(
      t.String({
        minLength: 1,
        maxLength: 128,
        description: 'Filter by partial email or display name match.',
      }),
    ),
    statuses: t.Optional(
      t.Array(t.Enum(UserStatus), {
        minItems: 1,
        maxItems: 25,
        description: 'Filter by any of the provided user statuses.',
      }),
    ),
    roleIds: t.Optional(
      t.Array(t.String(), {
        minItems: 1,
        maxItems: 25,
        description: 'Filter by any of the provided role ids.',
      }),
    ),
  }),
]);

const AdminUserSummaryDto = t.Object({
  id: t.String(),
  email: t.String({ format: 'email' }),
  status: t.Enum(UserStatus),
  name: displayNameField,
  created: isoDateField,
  emailVerified: t.Boolean(),
  roles: roleListDto,
  protected: t.Boolean(),
});

export const AdminUserListResDto = PaginatedDto(AdminUserSummaryDto);

export const AdminUserDetailResDto = t.Object({
  id: t.String(),
  email: t.String({ format: 'email' }),
  status: t.Enum(UserStatus),
  name: displayNameField,
  created: isoDateField,
  modified: isoDateField,
  emailVerified: t.Boolean(),
  lockoutUntil: t.Nullable(isoDateField),
  lockoutReason: t.Nullable(t.Enum(LockoutReason)),
  passwordAttempt: t.Integer(),
  passwordExpired: t.Nullable(isoDateField),
  protected: t.Boolean(),
  roles: roleListDto,
});
