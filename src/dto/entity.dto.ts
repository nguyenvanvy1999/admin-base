import { EntityType } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';
import {
  createArrayPreprocess,
  createListQueryDto,
  DeleteManyDto,
  DeleteResponseDto,
  type IDeleteManyDto,
  PaginationDto,
} from './common.dto';

export const UpsertEntityDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(EntityType),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  note: z.string().optional(),
});

export const ListEntitiesQueryDto = createListQueryDto({
  search: z.string().optional(),
  type: createArrayPreprocess(z.enum(EntityType)),
  sortBy: z.enum(['name', 'type', 'createdAt']).optional(),
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

export const EntityPaginationDto = PaginationDto;

export const EntityListResponseDto = t.NoValidate(
  t.Object({
    entities: t.Array(EntityDto),
    pagination: PaginationDto,
  }),
);

export const EntityDeleteResponseDto = DeleteResponseDto;

export type EntityResponse = typeof EntityDto.static;
export type EntityListResponse = typeof EntityListResponseDto.static;
export type EntityDeleteResponse = typeof EntityDeleteResponseDto.static;
