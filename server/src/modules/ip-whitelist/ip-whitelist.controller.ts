import { Elysia, t } from 'elysia';
import {
  IpWhitelistDetailResDto,
  IpWhitelistPaginationDto,
  PaginateIpWhitelistResDto,
  UpsertIpWhitelistDto,
} from 'src/dtos/ip-whitelist.dto';
import { authCheck } from 'src/services/auth';
import { ipWhitelistService } from 'src/services/security/ip-whitelist.service';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  type ICurrentUser,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

const canIpWhitelistView = (user: ICurrentUser) =>
  user.permissions.includes('IPWHITELIST.VIEW');

const canIpWhitelistCreateOrUpdate = (user: ICurrentUser) =>
  user.permissions.includes('IPWHITELIST.CREATE') ||
  user.permissions.includes('IPWHITELIST.UPDATE');

const canIpWhitelistDelete = (user: ICurrentUser) =>
  user.permissions.includes('IPWHITELIST.DELETE');

export const ipWhitelistController = new Elysia({
  prefix: '/user-ip-whitelists',
  tags: [DOC_TAG.ADMIN_IP_WHITELIST],
  detail: { security: ACCESS_AUTH },
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const hasViewPermission = canIpWhitelistView(currentUser);

      return castToRes(
        await ipWhitelistService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission,
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
      const hasViewPermission = canIpWhitelistView(currentUser);

      const result = await ipWhitelistService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission,
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
  .post(
    '/',
    async ({ body, currentUser }) => {
      const hasViewPermission = canIpWhitelistCreateOrUpdate(currentUser);

      await ipWhitelistService.upsert(
        body as typeof UpsertIpWhitelistDto.static,
        {
          currentUserId: currentUser.id,
          hasViewPermission,
        },
      );
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
  .post(
    '/del',
    async ({ body, currentUser }) => {
      const hasViewPermission = canIpWhitelistDelete(currentUser);

      await ipWhitelistService.removeMany((body as typeof IdsDto.static).ids, {
        currentUserId: currentUser.id,
        hasViewPermission,
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
