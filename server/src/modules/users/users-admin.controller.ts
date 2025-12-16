import { Elysia } from 'elysia';
import {
  AdminUserActionResDto,
  AdminUserCreateDto,
  AdminUserDetailResDto,
  AdminUserListQueryDto,
  AdminUserListResDto,
  AdminUserMfaActionDto,
  AdminUserUpdateDto,
  AdminUserUpdateRolesDto,
} from 'src/dtos/users.dto';
import { authCheck, authorize, has } from 'src/services/auth';
import { usersService } from 'src/services/users';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  ResWrapper,
} from 'src/share';

export const usersAdminController = new Elysia({
  prefix: '/admin/users',
  tags: [DOC_TAG.ADMIN_USER],
})
  .use(authCheck)
  .use(authorize(has('USER.VIEW')))
  .get(
    '/',
    async ({ query }) => castToRes(await usersService.listUsers(query)),
    {
      query: AdminUserListQueryDto,
      response: {
        200: ResWrapper(AdminUserListResDto),
        ...authErrors,
      },
    },
  )
  .get(
    '/:id',
    async ({ params: { id } }) =>
      castToRes(await usersService.getUserDetail(id)),
    {
      params: IdDto,
      response: {
        200: ResWrapper(AdminUserDetailResDto),
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('USER.UPDATE')))
  .post(
    '/',
    async ({ body }) =>
      castToRes(
        await usersService.createUser({
          ...body,
        }),
      ),
    {
      body: AdminUserCreateDto,
      response: {
        200: ResWrapper(AdminUserActionResDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .patch(
    '/:id/roles',
    async ({ params: { id }, body }) =>
      castToRes(
        await usersService.updateUserRoles({
          targetUserId: id,
          ...body,
        }),
      ),
    {
      params: IdDto,
      body: AdminUserUpdateRolesDto,
      response: {
        200: ResWrapper(AdminUserActionResDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body }) =>
      castToRes(
        await usersService.updateUser({
          targetUserId: id,
          ...body,
        }),
      ),
    {
      params: IdDto,
      body: AdminUserUpdateDto,
      response: {
        200: ResWrapper(AdminUserActionResDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('USER.RESET_MFA')))
  .post(
    '/:id/mfa/reset',
    async ({ params: { id }, body }) =>
      castToRes(
        await usersService.resetUserMfa({
          targetUserId: id,
          ...body,
        }),
      ),
    {
      params: IdDto,
      body: AdminUserMfaActionDto,
      response: {
        200: ResWrapper(AdminUserActionResDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .post(
    '/:id/mfa/disable',
    async ({ params: { id }, body }) =>
      castToRes(
        await usersService.disableUserMfa({
          targetUserId: id,
          ...body,
        }),
      ),
    {
      params: IdDto,
      body: AdminUserMfaActionDto,
      response: {
        200: ResWrapper(AdminUserActionResDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
