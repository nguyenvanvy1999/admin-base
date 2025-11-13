import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated/prisma/client';
import { anyOf, authorize, has } from '@server/services/auth/authorization';
import { castToRes, defaultRoles, ResWrapper } from '@server/share';
import { ErrorCode, throwAppError } from '@server/share/constants/error';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import {
  type IListRolesQueryDto,
  RoleListResponseDto,
  RolePaginationQueryDto,
  UpsertRoleDto,
} from '../../dto/admin';

const FROZEN_ROLE_IDS = [defaultRoles.user.id, defaultRoles.admin.id];

function isFrozenRole(roleId: string): boolean {
  return FROZEN_ROLE_IDS.includes(roleId);
}

export const roleController = new Elysia<'roles', AppAuthMeta>({
  prefix: 'roles',
})
  .use(authorize(has('ROLE.VIEW')))
  .get(
    '/',
    async ({ query }) => {
      const {
        search,
        userId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query as IListRolesQueryDto;

      const where: Prisma.RoleWhereInput = {};

      if (userId) {
        where.players = {
          some: { playerId: userId },
        };
      }

      if (search && search.trim()) {
        where.title = { contains: search.trim(), mode: 'insensitive' };
      }

      const orderBy: Prisma.RoleOrderByWithRelationInput = {};
      if (sortBy === 'title') {
        orderBy.title = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      }

      const skip = (page - 1) * limit;

      const [roles, total] = await Promise.all([
        prisma.role.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            title: true,
            description: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
            permissions: { select: { permissionId: true } },
            players: { select: { playerId: true } },
          },
        }),
        prisma.role.count({ where }),
      ]);

      return castToRes({
        roles: roles.map((role) => ({
          id: role.id,
          title: role.title,
          description: role.description,
          enabled: role.enabled,
          permissionIds: role.permissions.map((p) => p.permissionId),
          playerIds: role.players.map((p) => p.playerId),
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
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
      query: RolePaginationQueryDto,
      response: {
        200: ResWrapper(RoleListResponseDto),
      },
    },
  )
  .use(authorize(anyOf(has('ROLE.CREATE'), has('ROLE.UPDATE'))))
  .post(
    '/',
    async ({
      body: { id, title, enabled, description, playerIds, permissionIds },
      currentUser,
    }) => {
      if (id) {
        if (!currentUser.permissions.includes('ROLE.UPDATE')) {
          throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
        }

        if (isFrozenRole(id)) {
          throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
        }

        await prisma.role.update({
          where: { id },
          data: {
            description,
            title,
            enabled,
            permissions: {
              deleteMany: {
                roleId: id,
                permissionId: { notIn: permissionIds },
              },
              createMany: {
                skipDuplicates: true,
                data: permissionIds.map((permId) => ({
                  permissionId: permId,
                })),
              },
            },
            players: {
              deleteMany: {
                roleId: id,
                playerId: { notIn: playerIds },
              },
              createMany: {
                skipDuplicates: true,
                data: playerIds.map((playerId) => ({
                  playerId,
                })),
              },
            },
          },
          select: { id: true },
        });
      } else {
        if (!currentUser.permissions.includes('ROLE.CREATE')) {
          throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
        }

        await prisma.role.create({
          data: {
            description,
            title,
            enabled,
            permissions: {
              createMany: {
                data: permissionIds.map((permId) => ({
                  permissionId: permId,
                })),
              },
            },
            players: {
              createMany: {
                data: playerIds.map((playerId) => ({
                  playerId,
                })),
              },
            },
          },
          select: { id: true },
        });
      }
      return castToRes(null);
    },
    {
      body: UpsertRoleDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ResWrapper(t.Null()),
      },
    },
  )
  .use(authorize(has('ROLE.DELETE')))
  .post(
    '/del',
    async ({ body: { ids } }) => {
      for (const roleId of ids) {
        if (isFrozenRole(roleId)) {
          throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
        }
      }

      const existUserRole = await prisma.rolePlayer.findFirst({
        where: { roleId: { in: ids } },
      });
      if (existUserRole) {
        throwAppError(ErrorCode.PERMISSION_DENIED, 'Permission denied');
      }

      await prisma.role.deleteMany({
        where: {
          id: { in: ids },
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
