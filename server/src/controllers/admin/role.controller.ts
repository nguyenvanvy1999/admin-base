import { anyOf, authorize, has } from '@server/services/auth/authorization';
import { roleService } from '@server/services/auth/role.service';
import type { AppAuthMeta } from '@server/share';
import { castToRes, ResWrapper } from '@server/share';
import { Elysia, t } from 'elysia';
import {
  type IListRolesQueryDto,
  RoleListResponseDto,
  RolePaginationQueryDto,
  UpsertRoleDto,
} from '../../dto/admin';

export const roleController = new Elysia<'roles', AppAuthMeta>({
  prefix: 'roles',
})
  .use(authorize(has('ROLE.VIEW')))
  .get(
    '/',
    async ({ query }) => {
      const result = await roleService.listRoles(query as IListRolesQueryDto);
      return castToRes(result);
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
    async ({ body, currentUser }) => {
      await roleService.upsertRole(body, currentUser.permissions);
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
      await roleService.deleteRoles(ids);
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
