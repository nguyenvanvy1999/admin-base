import { UserRole } from '@server/generated/browser-index';
import { t } from 'elysia';
import { z } from 'zod';
import {
  CurrencyDto,
  createArrayPreprocess,
  createListQueryDto,
  PaginationDto,
} from '../common.dto';

export const UpsertUserDto = z.object({
  id: z.string().optional(),
  username: z.string().min(1),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  role: z.enum([UserRole.user, UserRole.admin]),
  baseCurrencyId: z.string().optional(),
});

export const ListUsersQueryDto = createListQueryDto({
  search: z.string().optional(),
  role: createArrayPreprocess(z.enum([UserRole.user, UserRole.admin])),
  sortBy: z.enum(['username', 'name', 'role', 'createdAt']).optional(),
});

export type IUpsertUserDto = z.infer<typeof UpsertUserDto>;
export type IListUsersQueryDto = z.infer<typeof ListUsersQueryDto>;

export const UserCurrencyDto = CurrencyDto;

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

export const UserListResponseDto = t.NoValidate(
  t.Object({
    users: t.Array(UserResDto),
    pagination: PaginationDto,
  }),
);

export type UserResponse = typeof UserResDto.static;
export type UserListResponse = typeof UserListResponseDto.static;

export const UserStatisticsQueryDto = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('month').optional(),
});

export type IUserStatisticsQueryDto = z.infer<typeof UserStatisticsQueryDto>;

export const UserGrowthTimeSeriesDto = t.NoValidate(
  t.Object({
    date: t.String(),
    count: t.Integer(),
    newUsers: t.Integer(),
  }),
);

export const UserStatisticsResponseDto = t.NoValidate(
  t.Object({
    totalUsers: t.Integer(),
    newUsersThisMonth: t.Integer(),
    newUsersThisWeek: t.Integer(),
    usersByRole: t.Object({
      admin: t.Integer(),
      user: t.Integer(),
    }),
    userGrowthTimeSeries: t.Array(UserGrowthTimeSeriesDto),
  }),
);

export type UserStatisticsResponse = typeof UserStatisticsResponseDto.static;
