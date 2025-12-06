import { Elysia, t } from 'elysia';
import { roleService } from 'src/service/admin';
import { allOf, authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';
import {
  PaginateRoleResDto,
  RoleDetailResDto,
  RolePaginationDto,
  UpsertRoleDto,
} from './roles.dto';

export const rolesAdminController = new Elysia<'admin-role', AppAuthMeta>({
  prefix: '/admin',
  tags: [DOC_TAG.ADMIN_ROLE],
}).group('/roles', (app) =>
  app
    .use(authorize(has('ROLE.VIEW')))
    .get('/', async ({ query }) => castToRes(await roleService.list(query)), {
      query: RolePaginationDto,
      response: {
        200: ResWrapper(PaginateRoleResDto),
      },
    })
    .get(
      '/:id',
      async ({ params: { id } }) => {
        const result = await roleService.detail(id);
        return castToRes(result);
      },
      {
        params: IdDto,
        response: {
          200: ResWrapper(RoleDetailResDto),
          400: ErrorResDto,
          ...authErrors,
        },
      },
    )
    .use(authorize(has('ROLE.UPDATE')))
    .post(
      '/',
      async ({ body }) => {
        await roleService.upsert(body);
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
      async ({ body }) => {
        await roleService.delete(body);
        return castToRes(null);
      },
      {
        body: IdsDto,
        response: {
          200: ResWrapper(t.Null()),
          400: ResWrapper(t.Null()),
        },
      },
    ),
);
