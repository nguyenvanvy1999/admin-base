import { t } from 'elysia';
import { z } from 'zod';
import { createListQueryDto, PaginationDto } from '../common.dto';

export const UpsertRoleDto = t.Object({
  id: t.Optional(t.String()),
  enabled: t.Boolean({ default: true }),
  title: t.String({ minLength: 3 }),
  description: t.Nullable(t.Optional(t.String())),
  permissionIds: t.Array(t.String(), { minItems: 1 }),
  playerIds: t.Array(t.String(), { minItems: 0 }),
});

export const UpsertRoleDtoZod = z.object({
  id: z.string().optional(),
  enabled: z.boolean().default(true),
  title: z.string().min(3),
  description: z.string().nullable().optional(),
  permissionIds: z.array(z.string()).min(1),
  playerIds: z.array(z.string()).default([]),
});

export const ListRolesQueryDto = createListQueryDto({
  search: z.string().optional(),
  userId: z.string().optional(),
  sortBy: z.enum(['title', 'created']).optional().default('created'),
});

export type IListRolesQueryDto = z.infer<typeof ListRolesQueryDto>;

export const RoleResDto = t.NoValidate(
  t.Object({
    id: t.String(),
    title: t.String(),
    description: t.Nullable(t.String()),
    enabled: t.Boolean(),
    permissionIds: t.Array(t.String()),
    playerIds: t.Array(t.String()),
    created: t.String(),
    modified: t.String(),
  }),
);

export const RoleListResponseDto = t.NoValidate(
  t.Object({
    roles: t.Array(RoleResDto),
    pagination: PaginationDto,
  }),
);

export type RoleResponse = typeof RoleResDto.static;
export type RoleListResponse = typeof RoleListResponseDto.static;

export const RolePaginationQueryDto = t.Object({
  userId: t.Optional(t.String()),
  search: t.Optional(t.String()),
  page: t.Optional(t.Integer()),
  limit: t.Optional(t.Integer()),
  sortBy: t.Optional(t.Union([t.Literal('title'), t.Literal('created')])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});
