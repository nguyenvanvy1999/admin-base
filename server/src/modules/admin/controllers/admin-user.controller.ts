import { Elysia } from 'elysia';
import {
  AdminUserActionResDto,
  AdminUserMfaActionDto,
  AdminUserStatusResDto,
  AdminUserStatusUpdateDto,
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

export const adminUserController = new Elysia<'', AppAuthMeta>({
  tags: [DOC_TAG.ADMIN_USER],
}).group('/users', (app) =>
  app
    .use(authorize(has('USER.RESET_MFA')))
    .post(
      '/:id/mfa/reset',
      async ({ params: { id }, currentUser, body }) => {
        const result = await adminUserService.resetUserMfa({
          targetUserId: id,
          actorId: currentUser.id,
          reason: body.reason,
        });
        return castToRes(result);
      },
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
      async ({ params: { id }, currentUser, body }) => {
        const result = await adminUserService.disableUserMfa({
          targetUserId: id,
          actorId: currentUser.id,
          reason: body.reason,
        });
        return castToRes(result);
      },
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
    .use(authorize(has('USER.UPDATE')))
    .patch(
      '/:id/status',
      async ({ params: { id }, currentUser, body }) => {
        const result = await adminUserService.updateUserStatus({
          targetUserId: id,
          actorId: currentUser.id,
          status: body.status,
          reason: body.reason,
        });
        return castToRes(result);
      },
      {
        params: IdDto,
        body: AdminUserStatusUpdateDto,
        response: {
          200: ResWrapper(AdminUserStatusResDto),
          400: ErrorResDto,
          ...authErrors,
        },
      },
    ),
);
