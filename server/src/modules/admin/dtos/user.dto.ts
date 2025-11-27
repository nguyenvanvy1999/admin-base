import { t } from 'elysia';
import { UserStatus } from 'src/generated';

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

export const AdminUserStatusUpdateDto = t.Object({
  status: t.Enum(UserStatus, {
    description: 'Target status that will be applied to the user account.',
  }),
  reason: reasonField,
});

export const AdminUserActionResDto = t.Object({
  userId: t.String(),
  auditLogId: t.String(),
});

export const AdminUserStatusResDto = t.Object({
  userId: t.String(),
  status: t.Enum(UserStatus),
  auditLogId: t.String(),
});
