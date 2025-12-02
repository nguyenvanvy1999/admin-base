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
} from 'src/modules/admin/dtos';
import { adminUserService } from 'src/service/admin/user-admin.service';
import { authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  ResWrapper,
} from 'src/share';

const adminUserViewRoutes = new Elysia<'', AppAuthMeta>()
  .use(authorize(has('USER.VIEW')))
  .get(
    '/',
    async ({ query }) => castToRes(await adminUserService.listUsers(query)),
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
      castToRes(await adminUserService.getUserDetail(id)),
    {
      params: IdDto,
      response: {
        200: ResWrapper(AdminUserDetailResDto),
        404: ErrorResDto,
        ...authErrors,
      },
    },
  );

const adminUserManageRoutes = new Elysia<'', AppAuthMeta>()
  .use(authorize(has('USER.UPDATE')))
  .post(
    '/',
    async ({ body, currentUser }) =>
      castToRes(
        await adminUserService.createUser({
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
        await adminUserService.updateUserRoles({
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
  );
  .patch(
    '/:id',
    async ({ { id }, currentUser, body }) =>
      castToRes(
        await adminUserService.updateUser({
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
  );

const adminUserMfaRoutes = new Elysia<'', AppAuthMeta>()
  .use(authorize(has('USER.RESET_MFA')))
  .post(
    '/:id/mfa/reset',
    async ({ params: { id }, currentUser, body }) =>
      castToRes(
        await adminUserService.resetUserMfa({
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
        await adminUserService.disableUserMfa({
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

export const adminUserController = new Elysia<'', AppAuthMeta>({
  tags: [DOC_TAG.ADMIN_USER],
}).group('/users', (app) =>
  app
    .use(adminUserViewRoutes)
    .use(adminUserManageRoutes)
    .use(adminUserMfaRoutes),
);
