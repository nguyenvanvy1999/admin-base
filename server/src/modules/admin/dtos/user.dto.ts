import { t } from 'elysia';
import { LockoutReason, UserStatus } from 'src/generated';

const reasonField = t.Optional(
  t.String({
    minLength: 1,
    maxLength: 512,
    description: 'Optional reason that will be recorded in the audit log.',
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
  name: t.Optional(
    t.Nullable(
      t.String({
        minLength: 1,
        maxLength: 128,
        description: 'Display name shown inside the admin tools.',
      }),
    ),
  ),
  roleIds: t.Optional(
    t.Array(t.String({ minLength: 1 }), {
      minItems: 0,
      description: 'Complete list of role ids that should belong to the user.',
    }),
  ),
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
