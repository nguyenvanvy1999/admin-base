import { Elysia, t } from 'elysia';
import {
  PaginateRoleResDto,
  RoleDetailResDto,
  RolePaginationDto,
  UpsertRoleDto,
} from 'src/dtos/roles.dto';
import { allOf, authCheck, authorize, has } from 'src/services/auth';
import { rolesService } from 'src/services/roles';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const rolesAdminController = new Elysia({
  prefix: '/admin/roles',
  tags: [DOC_TAG.ADMIN_ROLE],
})
  .use(authCheck)
  .use(authorize(has('ROLE.VIEW')))
  .get('/', async ({ query }) => castToRes(await rolesService.list(query)), {
    query: RolePaginationDto,
    response: {
      200: ResWrapper(PaginateRoleResDto),
      ...authErrors,
    },
  })
  .get(
    '/:id',
    async ({ params: { id } }) => {
      const result = await rolesService.detail(id);
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
    async ({ body, currentUser }) => {
      await rolesService.upsert(body, currentUser.id);
      return castToRes(null);
    },
    {
      body: UpsertRoleDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(allOf(has('ROLE.UPDATE'), has('ROLE.DELETE'))))
  .post(
    '/del',
    async ({ body, currentUser }) => {
      await rolesService.delete(body, currentUser.id);
      return castToRes(null);
    },
    {
      body: IdsDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
