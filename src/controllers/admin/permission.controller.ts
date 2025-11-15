import { prisma } from '@server/configs/db';
import type { Prisma } from '@server/generated';
import { authorize, has } from '@server/services/auth/authorization';
import type { AppAuthMeta } from '@server/share';
import { castToRes, ResWrapper } from '@server/share';
import { Elysia, t } from 'elysia';
import { PermissionQueryDto, PermissionResDto } from '../../dto/admin';

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
      const permissions = await prisma.permission.findMany({
        where,
        orderBy: { title: 'desc' },
      });
      return castToRes(permissions);
    },
    {
      query: PermissionQueryDto,
      response: {
        200: ResWrapper(t.Array(PermissionResDto)),
      },
    },
  );
