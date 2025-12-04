import { Elysia, t } from 'elysia';
import {
  PaginateUserIpWhitelistResDto,
  UpsertUserIpWhitelistDto,
  UserIpWhitelistDetailResDto,
  UserIpWhitelistPaginationDto,
} from 'src/modules/admin/dtos/user-ip-whitelist.dto';
import { userIpWhitelistAdminService } from 'src/service/admin/user-ip-whitelist-admin.service';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrCode,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
  UnAuthErr,
} from 'src/share';

export const adminUserIpWhitelistController = new Elysia<
  'admin-user-ip-whitelist',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_USER],
}).group('/user-ip-whitelists', (app) =>
  app
    .get(
      '/',
      async ({ query, currentUser }) => {
        if (!currentUser.permissions.includes('IPWHITELIST.VIEW')) {
          query.userIds = [currentUser.id];
        }
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
      async ({ params: { id }, currentUser }) => {
        const userId = !currentUser.permissions.includes('IPWHITELIST.VIEW')
          ? currentUser.id
          : undefined;

        const result = await userIpWhitelistAdminService.detail(id, userId);
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
    .post(
      '/',
      async ({ body, currentUser }) => {
        if (
          !currentUser.permissions.includes('IPWHITELIST.UPDATE') &&
          body.userId !== currentUser.id
        ) {
          throw new UnAuthErr(ErrCode.ActionNotAllowed);
        }

        const restrictToUserId = !currentUser.permissions.includes(
          'IPWHITELIST.UPDATE',
        )
          ? currentUser.id
          : undefined;

        await userIpWhitelistAdminService.upsert(body, restrictToUserId);
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
    .post(
      '/del',
      async ({ body, currentUser }) => {
        const restrictToUserId = !currentUser.permissions.includes(
          'IPWHITELIST.UPDATE',
        )
          ? currentUser.id
          : undefined;

        await userIpWhitelistAdminService.removeMany(
          body.ids,
          restrictToUserId,
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
