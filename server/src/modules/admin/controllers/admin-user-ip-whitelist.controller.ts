import { Elysia, t } from 'elysia';
import {
  PaginateUserIpWhitelistResDto,
  UpsertUserIpWhitelistDto,
  UserIpWhitelistDetailResDto,
  UserIpWhitelistPaginationDto,
} from 'src/modules/admin/dtos/user-ip-whitelist.dto';
import { userIpWhitelistAdminService } from 'src/service/admin';
import { anyOf, authorize, has } from 'src/service/auth/authorization';
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

export const adminUserIpWhitelistController = new Elysia<
  'admin-user-ip-whitelist',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_USER_IP_WHITELIST],
}).group('/user-ip-whitelists', (app) =>
  app
    .use(authorize(has('IPWHITELIST.VIEW')))
    .get(
      '/',
      async ({ query }) => {
        return castToRes(await userIpWhitelistAdminService.list(query));
      },
      {
        query: UserIpWhitelistPaginationDto,
        response: {
          200: ResWrapper(PaginateUserIpWhitelistResDto),
          ...authErrors,
        },
      },
    )
    .get(
      '/:id',
      async ({ params: { id } }) => {
        const result = await userIpWhitelistAdminService.detail(id);
        return castToRes(result);
      },
      {
        params: IdDto,
        response: {
          200: ResWrapper(UserIpWhitelistDetailResDto),
          400: ErrorResDto,
          404: ErrorResDto,
          ...authErrors,
        },
      },
    )
    .use(authorize(anyOf(has('IPWHITELIST.CREATE'), has('IPWHITELIST.UPDATE'))))
    .post(
      '/',
      async ({ body }) => {
        await userIpWhitelistAdminService.upsert(body);
        return castToRes(null);
      },
      {
        body: UpsertUserIpWhitelistDto,
        response: {
          200: ResWrapper(t.Null()),
          400: ErrorResDto,
          ...authErrors,
        },
      },
    )
    .use(authorize(has('IPWHITELIST.DELETE')))
    .post(
      '/del',
      async ({ body }) => {
        await userIpWhitelistAdminService.removeMany(body.ids);
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
    ),
);
