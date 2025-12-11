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
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import { usersService } from 'src/service/users';
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
    async ({ body, currentUser }) =>
      castToRes(
        await usersService.createUser({
          actorId: currentUser.id,
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
    async ({ params: { id }, currentUser, body }) =>
      castToRes(
        await usersService.updateUserRoles({
          targetUserId: id,
          actorId: currentUser.id,
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
    async ({ params: { id }, currentUser, body }) =>
      castToRes(
        await usersService.updateUser({
          targetUserId: id,
          actorId: currentUser.id,
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
    async ({ params: { id }, currentUser, body }) =>
      castToRes(
        await usersService.resetUserMfa({
          targetUserId: id,
          actorId: currentUser.id,
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
    async ({ params: { id }, currentUser, body }) =>
      castToRes(
        await usersService.disableUserMfa({
          targetUserId: id,
          actorId: currentUser.id,
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
