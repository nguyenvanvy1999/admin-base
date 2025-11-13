import { CURRENCY_IDS } from '@server/constants/currency';
import type { Prisma } from '@server/generated/prisma/client';
import { UserRole } from '@server/generated/prisma/enums';
import { prisma } from '@server/libs/db';
import { anyOf, authorize, has } from '@server/service/auth/authorization';
import { castToRes, ErrCode, ResWrapper, SUPER_ADMIN_ID } from '@server/share';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import {
  type IListUsersQueryDto,
  type IUpsertUserDto,
  ListUsersQueryDto,
  UpsertUserDto,
  UserListResponseDto,
  UserResDto,
} from '../dtos';

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
        throw new Error(ErrCode.UserNotFound);
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
        throw new Error(ErrCode.PermissionDenied);
      }

      if (baseCurrencyId) {
        const currencyExists = await prisma.currency.count({
          where: { id: baseCurrencyId },
        });
        if (currencyExists === 0) {
          throw new Error(ErrCode.ItemNotFound);
        }
      }

      if (id) {
        const existingUser = await prisma.user.findFirst({
          where: { id, deletedAt: null },
        });
        if (!existingUser) {
          throw new Error(ErrCode.UserNotFound);
        }

        if (username && username !== existingUser.username) {
          const usernameExists = await prisma.user.findFirst({
            where: { username, deletedAt: null },
          });
          if (usernameExists) {
            throw new Error(ErrCode.UserExisted);
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
          throw new Error(ErrCode.UserExisted);
        }

        if (!password) {
          throw new Error(ErrCode.ValidationError);
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
        throw new Error(ErrCode.PermissionDenied);
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
