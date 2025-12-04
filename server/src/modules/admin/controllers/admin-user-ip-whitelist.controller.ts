import { Elysia, t } from 'elysia';
import {
  CreateUserIpWhitelistDto,
  DeleteUserIpWhitelistDto,
  UserIpWhitelistListQueryDto,
  UserIpWhitelistResponseDto,
} from 'src/modules/admin/dtos/user-ip-whitelist.dto';
import { userIpWhitelistAdminService } from 'src/service/admin/user-ip-whitelist-admin.service';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  PaginatedDto,
  ResWrapper,
} from 'src/share';

export const adminUserIpWhitelistController = new Elysia<
  '/user-ip-whitelists',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_USER],
  prefix: '/user-ip-whitelists',
})
  .get(
    '/',
    async ({ query, currentUser }) =>
      castToRes(await userIpWhitelistAdminService.list(query, currentUser)),
    {
      query: UserIpWhitelistListQueryDto,
      response: {
        200: ResWrapper(PaginatedDto(UserIpWhitelistResponseDto)),
        ...authErrors,
      },
    },
  )
  .post(
    '/',
    async ({ body, currentUser }) =>
      castToRes(await userIpWhitelistAdminService.upsert(body, currentUser)),
    {
      body: CreateUserIpWhitelistDto,
      response: {
        200: ResWrapper(UserIpWhitelistResponseDto),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .delete(
    '/',
    async ({ body, currentUser }) =>
      castToRes(
        await userIpWhitelistAdminService.removeMany(body.ids, currentUser),
      ),
    {
      body: DeleteUserIpWhitelistDto,
      response: {
        200: ResWrapper(t.Object({ count: t.Number() })),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
