import { authorize, has } from '@server/services/auth/authorization';
import { permissionService } from '@server/services/auth/permission.service';
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
      const result = await permissionService.listPermissions(roleId);
      return castToRes(result);
    },
    {
      query: PermissionQueryDto,
      response: {
        200: ResWrapper(t.Array(PermissionResDto)),
      },
    },
  );
