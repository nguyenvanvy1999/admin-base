import { t } from 'elysia';

export const RolePlayerDto = t.Object({
  playerId: t.String(),
  expiresAt: t.Nullable(t.String()),
});

export const UpsertRoleDto = t.Object({
  id: t.Optional(t.String()),
  enabled: t.Boolean({ default: true }),
  title: t.String({ minLength: 3 }),
  description: t.Nullable(t.Optional(t.String())),
  permissionIds: t.Array(t.String(), { minItems: 1 }),
  players: t.Array(RolePlayerDto, { minItems: 0 }),
});

export const PaginateRoleResDto = t.Array(
  t.Intersect([
    t.Omit(UpsertRoleDto, ['enabled', 'players']),
    t.Object({
      id: t.String(),
      permissionIds: t.Array(t.String()),
      protected: t.Boolean(),
      totalPlayers: t.Number(),
      activePlayers: t.Number(),
      expiredPlayers: t.Number(),
    }),
  ]),
);

export const RoleDetailPlayerDto = t.Object({
  id: t.String(),
  email: t.String(),
  expiresAt: t.Nullable(t.String()),
});

export const RoleDetailResDto = t.Object({
  id: t.String(),
  title: t.String(),
  description: t.Nullable(t.Optional(t.String())),
  enabled: t.Boolean(),
  protected: t.Boolean(),
  permissionIds: t.Array(t.String()),
  players: t.Array(RoleDetailPlayerDto),
});

export const RolePaginationDto = t.Object({
  userId: t.Optional(t.String()),
  search: t.Optional(t.String()),
});
