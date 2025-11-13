import type { Prisma } from '@server/generated/prisma';
import { prisma } from '@server/libs/db';
import { authorize, has } from '@server/service/auth/authorization';
import { castToRes } from '@server/share';
import type { AppAuthMeta } from '@server/share/type';
import { Elysia, t } from 'elysia';
import { PermissionQueryDto, PermissionResDto } from '../dtos';

function ResWrapper<T>(schema: T): T {
  return t.Object({
    data: schema as any,
  }) as T;
}

export const permissionController = new Elysia<'permissions', AppAuthMeta>({
  prefix: 'permissions',
})
  .use(authorize(has('ROLE.VIEW')))
  .get(
    '/',
    async ({ query: { roleId } }) => {
      const where: Prisma.PermissionWhereInput = roleId
        ? { roles: { some: { roleId } } }
        : {};
      return castToRes(
        await prisma.permission.findMany({
          where,
          orderBy: { title: 'desc' },
        }),
      );
    },
    {
      query: PermissionQueryDto,
      response: {
        200: ResWrapper(t.Array(PermissionResDto)),
      },
    },
  );
