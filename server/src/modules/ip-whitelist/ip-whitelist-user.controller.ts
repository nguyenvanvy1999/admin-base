import { Elysia, t } from 'elysia';
import { userIpWhitelistAdminService } from 'src/service/admin';
import { authCheck } from 'src/service/auth/auth.middleware';
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

export const ipWhitelistUserController = new Elysia<
  'ip-whitelist-user',
  AppAuthMeta
>({
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .group('/user-ip-whitelists', (app) =>
    app
      .get(
        '/',
        async ({ query, currentUser }) => {
          query.userIds = [currentUser.id];
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
        async ({ params: { id }, currentUser }) => {
          const result = await userIpWhitelistAdminService.detail(
            id,
            currentUser.id,
          );
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
          body.userId = currentUser.id;
          await userIpWhitelistAdminService.upsert(body, currentUser.id);
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
          await userIpWhitelistAdminService.removeMany(
            body.ids,
            currentUser.id,
          );
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
