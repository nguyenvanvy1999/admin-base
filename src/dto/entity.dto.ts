import { EntityType } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import { DeleteManyDto, type IDeleteManyDto } from './common.dto';

export const UpsertEntityDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(Object.values(EntityType) as [string, ...string[]]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  note: z.string().optional(),
});

export const ListEntitiesQueryDto = z.object({
  search: z.string().optional(),
  type: z
    .array(z.enum(Object.values(EntityType) as [string, ...string[]]))
    .optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['name', 'type', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const DeleteManyEntitiesDto = DeleteManyDto;

export type IUpsertEntityDto = z.infer<typeof UpsertEntityDto>;
export type IListEntitiesQueryDto = z.infer<typeof ListEntitiesQueryDto>;
export type IDeleteManyEntitiesDto = IDeleteManyDto;

export const EntityDto = t.NoValidate(
  t.Object({
    id: t.String(),
    name: t.String(),
    type: t.Enum(EntityType),
    phone: t.Nullable(t.String()),
    email: t.Nullable(t.String()),
    address: t.Nullable(t.String()),
    note: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
);

export const EntityPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const EntityListResponseDto = t.NoValidate(
  t.Object({
    entities: t.Array(EntityDto),
    pagination: EntityPaginationDto,
  }),
);

export const EntityDeleteResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
);

export type EntityResponse = typeof EntityDto.static;
export type EntityListResponse = typeof EntityListResponseDto.static;
export type EntityDeleteResponse = typeof EntityDeleteResponseDto.static;
