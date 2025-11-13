import { t } from 'elysia';

export const SessionResDto = t.Object({
  id: t.String(),
  userId: t.String(),
  device: t.Nullable(t.String()),
  ip: t.Nullable(t.String()),
  expired: t.Date(),
  revoked: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const SessionQueryDto = t.Object({
  userId: t.Optional(t.String()),
});

export const RevokeSessionDto = t.Object({
  sessionIds: t.Array(t.String(), { minItems: 1 }),
});
