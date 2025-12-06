import { Elysia, t } from 'elysia';
import { authCheck } from 'src/service/auth/auth.middleware';
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

export const ipWhitelistUserController = new Elysia({
  prefix: '/user-ip-whitelists',
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      return castToRes(
        await userIpWhitelistService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission: false,
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
        hasViewPermission: false,
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
      await userIpWhitelistService.upsert(body, {
        currentUserId: currentUser.id,
        hasViewPermission: false,
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
  .post(
    '/del',
    async ({ body, currentUser }) => {
      await userIpWhitelistService.removeMany(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission: false,
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
