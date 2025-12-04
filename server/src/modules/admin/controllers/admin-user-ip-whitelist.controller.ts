import { Elysia, t } from 'elysia';
import {
  CreateUserIpWhitelistDto,
  UserIpWhitelistResponseDto,
} from 'src/modules/admin/dtos/user-ip-whitelist.dto';
import { userIpWhitelistAdminService } from 'src/service/admin/user-ip-whitelist-admin.service';
import { authorize, has } from 'src/service/auth/authorization';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const adminUserIpWhitelistController = new Elysia({
  tags: [DOC_TAG.ADMIN_USER],
  prefix: '/users/:userId/ip-whitelist',
})
  .use(authorize(has('USER.UPDATE')))
  .get(
    '/',
    async ({ params: { userId } }) =>
      castToRes(await userIpWhitelistAdminService.list(userId)),
    {
      params: t.Object({ userId: t.String() }),
      response: {
        200: ResWrapper(t.Array(UserIpWhitelistResponseDto)),
        ...authErrors,
      },
    },
  )
  .post(
    '/',
    async ({ params: { userId }, body }) =>
      castToRes(await userIpWhitelistAdminService.add(userId, body.ip)),
    {
      params: t.Object({ userId: t.String() }),
      body: CreateUserIpWhitelistDto,
      response: {
        200: ResWrapper(UserIpWhitelistResponseDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .delete(
    '/:id',
    async ({ params: { userId, id } }) =>
      castToRes(await userIpWhitelistAdminService.remove(userId, id)),
    {
      params: t.Object({ userId: t.String(), id: t.String() }),
      response: {
        200: ResWrapper(UserIpWhitelistResponseDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
