import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { UserRole } from '@server/generated';
import { anyOf, authorize, has } from '@server/services/auth/authorization';
import type { AppAuthMeta } from '@server/share';
import {
  CURRENCY_IDS,
  castToRes,
  ErrorCode,
  ResWrapper,
  SUPER_ADMIN_ID,
  throwAppError,
} from '@server/share';
import { Elysia, t } from 'elysia';
import {
  type IListUsersQueryDto,
  type IUpsertUserDto,
  type IUserStatisticsQueryDto,
  ListUsersQueryDto,
  UpsertUserDto,
  UserListResponseDto,
  UserResDto,
  UserStatisticsQueryDto,
  UserStatisticsResponseDto,
} from '../../dto/admin';

export const userController = new Elysia<'users', AppAuthMeta>({
  prefix: 'users',
})
  .use(authorize(anyOf(has('USER.VIEW'), has('USER.VIEW_ALL'))))
  .get(
    '/',
    async ({ query }) => {
      const {
        search,
        role,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query as IListUsersQueryDto;

      const where: Prisma.UserWhereInput = {
        deletedAt: null,
      };

      if (search && search.trim()) {
        where.OR = [
          { username: { contains: search.trim(), mode: 'insensitive' } },
          { name: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      if (role && role.length > 0) {
        where.role = { in: role };
      }

      const orderBy: Prisma.UserOrderByWithRelationInput = {};
      if (sortBy === 'username') {
        orderBy.username = sortOrder;
      } else if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'role') {
        orderBy.role = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            baseCurrencyId: true,
            createdAt: true,
            updatedAt: true,
            baseCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
                symbol: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return castToRes({
        users: users.map((user) => ({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          baseCurrencyId: user.baseCurrencyId,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          baseCurrency: user.baseCurrency
            ? {
                id: user.baseCurrency.id,
                code: user.baseCurrency.code,
                name: user.baseCurrency.name,
                symbol: user.baseCurrency.symbol,
              }
            : null,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },
    {
      query: ListUsersQueryDto,
      response: {
        200: ResWrapper(UserListResponseDto),
      },
    },
  )
  .get(
    '/:id',
    async ({ params }) => {
      const user = await prisma.user.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          baseCurrencyId: true,
          createdAt: true,
          updatedAt: true,
          baseCurrency: {
            select: {
              id: true,
              code: true,
              name: true,
              symbol: true,
            },
          },
        },
      });

      if (!user) {
        throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      return castToRes({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        baseCurrencyId: user.baseCurrencyId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        baseCurrency: user.baseCurrency
          ? {
              id: user.baseCurrency.id,
              code: user.baseCurrency.code,
              name: user.baseCurrency.name,
              symbol: user.baseCurrency.symbol,
            }
          : null,
      });
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: ResWrapper(UserResDto),
      },
    },
  )
  .get(
    '/statistics',
    async ({ query }) => {
      const {
        dateFrom,
        dateTo,
        groupBy = 'month',
      } = query as IUserStatisticsQueryDto;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const dateFromDate = dateFrom ? new Date(dateFrom) : undefined;
      const dateToDate = dateTo ? new Date(dateTo) : undefined;

      const baseWhere: Prisma.UserWhereInput = {
        deletedAt: null,
      };

      const [totalUsers, newUsersThisMonth, newUsersThisWeek, usersByRole] =
        await Promise.all([
          prisma.user.count({ where: baseWhere }),
          prisma.user.count({
            where: {
              ...baseWhere,
              createdAt: { gte: startOfMonth },
            },
          }),
          prisma.user.count({
            where: {
              ...baseWhere,
              createdAt: { gte: startOfWeek },
            },
          }),
          prisma.user.groupBy({
            by: ['role'],
            where: baseWhere,
            _count: { role: true },
          }),
        ]);

      const roleCounts = {
        admin: 0,
        user: 0,
      };
      usersByRole.forEach((item) => {
        if (item.role === UserRole.admin) {
          roleCounts.admin = item._count.role;
        } else {
          roleCounts.user = item._count.role;
        }
      });

      const timeSeriesWhere: Prisma.UserWhereInput = {
        ...baseWhere,
        ...(dateFromDate || dateToDate
          ? {
              createdAt: {
                ...(dateFromDate ? { gte: dateFromDate } : {}),
                ...(dateToDate ? { lte: dateToDate } : {}),
              },
            }
          : {}),
      };

      const allUsers = await prisma.user.findMany({
        where: timeSeriesWhere,
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const statsMap = new Map<string, { count: number; newUsers: number }>();

      let cumulativeCount = 0;
      const filterStartDate = dateFromDate || allUsers[0]?.createdAt;
      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        if (groupBy === 'day') {
          startDate.setHours(0, 0, 0, 0);
        } else if (groupBy === 'week') {
          startDate.setDate(startDate.getDate() - startDate.getDay());
          startDate.setHours(0, 0, 0, 0);
        } else {
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
        }

        const endDate = dateToDate || now;
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          let dateKey: string;
          if (groupBy === 'day') {
            dateKey = currentDate.toISOString().split('T')[0];
            currentDate.setDate(currentDate.getDate() + 1);
          } else if (groupBy === 'week') {
            dateKey = currentDate.toISOString().split('T')[0];
            currentDate.setDate(currentDate.getDate() + 7);
          } else {
            dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
          statsMap.set(dateKey, { count: cumulativeCount, newUsers: 0 });
        }
      }

      for (const user of allUsers) {
        const date = new Date(user.createdAt);
        let dateKey: string;
        if (groupBy === 'day') {
          dateKey = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
        } else {
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!statsMap.has(dateKey)) {
          statsMap.set(dateKey, { count: cumulativeCount, newUsers: 0 });
        }

        const stats = statsMap.get(dateKey)!;
        stats.newUsers++;
        cumulativeCount++;
        stats.count = cumulativeCount;
      }

      const userGrowthTimeSeries = Array.from(statsMap.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          newUsers: data.newUsers,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return castToRes({
        totalUsers,
        newUsersThisMonth,
        newUsersThisWeek,
        usersByRole: roleCounts,
        userGrowthTimeSeries,
      });
    },
    {
      query: UserStatisticsQueryDto,
      response: {
        200: ResWrapper(UserStatisticsResponseDto),
      },
    },
  )
  .use(authorize(has('USER.UPDATE')))
  .post(
    '/',
    async ({ body }) => {
      const { id, username, password, name, role, baseCurrencyId } =
        body as IUpsertUserDto;

      if (id && id === SUPER_ADMIN_ID) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }

      if (baseCurrencyId) {
        const currencyExists = await prisma.currency.count({
          where: { id: baseCurrencyId },
        });
        if (currencyExists === 0) {
          throwAppError(ErrorCode.CURRENCY_NOT_FOUND, 'Currency not found');
        }
      }

      if (id) {
        const existingUser = await prisma.user.findFirst({
          where: { id, deletedAt: null },
        });
        if (!existingUser) {
          throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
        }

        if (username && username !== existingUser.username) {
          const usernameExists = await prisma.user.findFirst({
            where: { username, deletedAt: null },
          });
          if (usernameExists) {
            throwAppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists');
          }
        }

        const updateData: Prisma.UserUncheckedUpdateInput = {
          username: username || existingUser.username,
          name: name ?? null,
          role: role || existingUser.role,
          baseCurrencyId: baseCurrencyId ?? undefined,
        };

        if (password) {
          updateData.password = await Bun.password.hash(password, 'bcrypt');
        }

        await prisma.user.update({
          where: { id },
          data: updateData,
        });
      } else {
        const usernameExists = await prisma.user.findFirst({
          where: { username, deletedAt: null },
        });
        if (usernameExists) {
          throwAppError(ErrorCode.USER_ALREADY_EXISTS, 'User already exists');
        }

        if (!password) {
          throwAppError(ErrorCode.VALIDATION_ERROR, 'Password is required');
        }

        const hashPassword = await Bun.password.hash(password, 'bcrypt');

        await prisma.user.create({
          data: {
            username,
            password: hashPassword,
            name: name ?? null,
            role: role || UserRole.user,
            baseCurrencyId: baseCurrencyId || CURRENCY_IDS.VND,
          },
        });
      }

      return castToRes(null);
    },
    {
      body: UpsertUserDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ResWrapper(t.Null()),
      },
    },
  )
  .use(authorize(has('USER.DELETE')))
  .post(
    '/del',
    async ({ body: { ids } }) => {
      if (ids.includes(SUPER_ADMIN_ID)) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }

      await prisma.user.updateMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return castToRes(null);
    },
    {
      body: t.Object({ ids: t.Array(t.String(), { minItems: 1 }) }),
      response: {
        200: ResWrapper(t.Null()),
        400: ResWrapper(t.Null()),
      },
    },
  );
