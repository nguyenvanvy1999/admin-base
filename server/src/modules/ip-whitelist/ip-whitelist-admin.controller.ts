import { Elysia, t } from 'elysia';
import {
  IpWhitelistDetailResDto,
  IpWhitelistPaginationDto,
  PaginateIpWhitelistResDto,
  UpsertIpWhitelistDto,
} from 'src/dtos/ip-whitelist.dto';
import { anyOf, authCheck, authorize, has } from 'src/services/auth';
import { ipWhitelistService } from 'src/services/security';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

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
        await ipWhitelistService.list({
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
      const result = await ipWhitelistService.detail(id, {
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
      const result = await ipWhitelistService.upsert(body, {
        currentUserId: currentUser.id,
        hasViewPermission:
          currentUser.permissions.includes('IPWHITELIST.CREATE') ||
          currentUser.permissions.includes('IPWHITELIST.UPDATE'),
      });
      return castToRes(result);
    },
    {
      body: UpsertIpWhitelistDto,
      response: {
        200: ResWrapper(t.Object({ id: t.String() })),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('IPWHITELIST.DELETE')))
  .post(
    '/del',
    async ({ body, currentUser }) => {
      await ipWhitelistService.removeMany(body.ids, {
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
