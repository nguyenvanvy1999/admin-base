import { Elysia, t } from 'elysia';
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
import {
  IpWhitelistDetailResDto,
  IpWhitelistPaginationDto,
  PaginateIpWhitelistResDto,
  UpsertIpWhitelistDto,
} from './ip-whitelist.dto';

export const ipWhitelistAdminController = new Elysia<
  'ip-whitelist-admin',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_USER_IP_WHITELIST],
}).group('/admin/user-ip-whitelists', (app) =>
  app
    .use(authorize(has('IPWHITELIST.VIEW')))
    .get(
      '/',
      async ({ query }) => {
        return castToRes(await userIpWhitelistAdminService.list(query));
      },
      {
        query: IpWhitelistPaginationDto,
        response: {
          200: ResWrapper(PaginateIpWhitelistResDto),
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
          200: ResWrapper(IpWhitelistDetailResDto),
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
        body: UpsertIpWhitelistDto,
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
