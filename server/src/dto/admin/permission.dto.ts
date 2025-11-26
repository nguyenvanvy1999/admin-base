import { t } from 'elysia';

export const PermissionResDto = t.Object({
  id: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
});

export const PermissionQueryDto = t.Object({
  roleId: t.Optional(t.String()),
});
