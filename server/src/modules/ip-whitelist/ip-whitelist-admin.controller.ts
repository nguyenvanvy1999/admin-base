import { Elysia, t } from 'elysia';
import { authCheck } from 'src/service/auth/auth.middleware';
import { anyOf, authorize, has } from 'src/service/auth/authorization';
import { userIpWhitelistService } from 'src/service/user-ip-whitelist';
import {
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

export const ipWhitelistAdminController = new Elysia({
  prefix: '/admin/user-ip-whitelists',
  tags: [DOC_TAG.ADMIN_USER_IP_WHITELIST],
})
  .use(authCheck)
  .use(authorize(has('IPWHITELIST.VIEW')))
  .get(
    '/',
    async ({ query, currentUser }) => {
      return castToRes(
        await userIpWhitelistService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission:
            currentUser.permissions.includes('IPWHITELIST.VIEW'),
        }),
      );
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
    async ({ params: { id }, currentUser }) => {
      const result = await userIpWhitelistService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission: currentUser.permissions.includes('IPWHITELIST.VIEW'),
      });
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
    async ({ body, currentUser }) => {
      await userIpWhitelistService.upsert(body, {
        currentUserId: currentUser.id,
        hasViewPermission:
          currentUser.permissions.includes('IPWHITELIST.CREATE') ||
          currentUser.permissions.includes('IPWHITELIST.UPDATE'),
      });
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
    async ({ body, currentUser }) => {
      await userIpWhitelistService.removeMany(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission:
          currentUser.permissions.includes('IPWHITELIST.DELETE'),
      });
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
