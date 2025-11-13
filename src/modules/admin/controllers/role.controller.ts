import type { Prisma } from '@server/generated/prisma/client';
import { prisma } from '@server/libs/db';
import { allOf, authorize, has } from '@server/service/auth/authorization';
import { castToRes, ErrCode, ResWrapper } from '@server/share';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import { PaginateRoleResDto, RolePaginationDto, UpsertRoleDto } from '../dtos';

export const roleController = new Elysia<'roles', AppAuthMeta>({
  prefix: 'roles',
})
  .use(authorize(has('ROLE.VIEW')))
  .get(
    '/',
    async ({ query: { userId } }) => {
      const where: Prisma.RoleWhereInput = {};
      if (userId) {
        where.players = {
          some: { playerId: userId },
        };
      }

      const roles = await prisma.role.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          enabled: true,
          permissions: { select: { permissionId: true } },
          players: { select: { playerId: true } },
        },
      });

      return castToRes(
        roles.map((role) => ({
          id: role.id,
          title: role.title,
          description: role.description,
          enabled: role.enabled,
          permissionIds: role.permissions.map((p) => p.permissionId),
          playerIds: role.players.map((p) => p.playerId),
        })),
      );
    },
    {
      query: RolePaginationDto,
      response: {
        200: ResWrapper(PaginateRoleResDto),
      },
    },
  )
  .use(authorize(has('ROLE.UPDATE')))
  .post(
    '/',
    async ({
      body: { id, title, enabled, description, playerIds, permissionIds },
    }) => {
      if (id) {
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
  .use(authorize(allOf(has('ROLE.UPDATE'), has('ROLE.DELETE'))))
  .post(
    '/del',
    async ({ body: { ids } }) => {
      const existUserRole = await prisma.rolePlayer.findFirst({
        where: { roleId: { in: ids } },
      });
      if (existUserRole) {
        throw new Error(ErrCode.PermissionDenied);
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
