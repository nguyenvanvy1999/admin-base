import { UserRole } from '@server/generated/prisma/enums';
import { t } from 'elysia';
import { z } from 'zod';

export const UpsertUserDto = z.object({
  id: z.string().optional(),
  username: z.string().min(1),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  role: z.enum([UserRole.user, UserRole.admin]),
  baseCurrencyId: z.string().optional(),
});

export const ListUsersQueryDto = z.object({
  search: z.string().optional(),
  role: z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    return Array.isArray(val) ? val : [val];
  }, z.array(z.enum([UserRole.user, UserRole.admin])).optional()),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).default(20).optional(),
  sortBy: z.enum(['username', 'name', 'role', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IUpsertUserDto = z.infer<typeof UpsertUserDto>;
export type IListUsersQueryDto = z.infer<typeof ListUsersQueryDto>;

const currencyShape = {
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
} as const;

export const UserCurrencyDto = t.NoValidate(t.Object(currencyShape));

export const UserResDto = t.NoValidate(
  t.Object({
    id: t.String(),
    username: t.String(),
    name: t.Nullable(t.String()),
    role: t.Enum(UserRole),
    baseCurrencyId: t.Nullable(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
    baseCurrency: t.Nullable(UserCurrencyDto),
  }),
);

export const UserPaginationDto = t.NoValidate(
  t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    total: t.Integer(),
    totalPages: t.Integer(),
  }),
);

export const UserListResponseDto = t.NoValidate(
  t.Object({
    users: t.Array(UserResDto),
    pagination: UserPaginationDto,
  }),
);

export type UserResponse = typeof UserResDto.static;
export type UserListResponse = typeof UserListResponseDto.static;
