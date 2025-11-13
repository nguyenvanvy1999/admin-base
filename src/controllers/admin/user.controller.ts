import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated/prisma/client';
import { UserRole } from '@server/generated/prisma/enums';
import { anyOf, authorize, has } from '@server/services/auth/authorization';
import { castToRes, ResWrapper, SUPER_ADMIN_ID } from '@server/share';
import { CURRENCY_IDS } from '@server/share/constants/currency';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import {
  type IListUsersQueryDto,
  type IUpsertUserDto,
  ListUsersQueryDto,
  UpsertUserDto,
  UserListResponseDto,
  UserResDto,
} from '../../dto/admin';

export const userController = new Elysia<'users', AppAuthMeta>({
  prefix: 'users',
})
  .use(authorize(anyOf(has('USER.VIEW'), has('USER.VIEW_ALL'))))
  .get(
    '/',
    async ({ query, currentUser }) => {
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
