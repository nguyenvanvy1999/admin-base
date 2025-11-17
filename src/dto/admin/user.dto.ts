import { t } from 'elysia';
import { z } from 'zod';
import { CurrencyDto, createListQueryDto, PaginationDto } from '../common.dto';

export const UpsertUserDto = z.object({
  id: z.string().optional(),
  username: z.string().min(1),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  baseCurrencyId: z.string().optional(),
});

export const ListUsersQueryDto = createListQueryDto({
  search: z.string().optional(),
  sortBy: z.enum(['username', 'name', 'role', 'created']).optional(),
});

export type IUpsertUserDto = z.infer<typeof UpsertUserDto>;
export type IListUsersQueryDto = z.infer<typeof ListUsersQueryDto>;

export const UserRoleDto = t.NoValidate(
  t.Object({
    id: t.String(),
    title: t.String(),
  }),
);

export const UserResDto = t.NoValidate(
  t.Object({
    id: t.String(),
    username: t.String(),
    name: t.Nullable(t.String()),
    baseCurrencyId: t.Nullable(t.String()),
    created: t.String(),
    modified: t.String(),
    baseCurrency: t.Nullable(CurrencyDto),
    roles: t.Array(UserRoleDto),
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
