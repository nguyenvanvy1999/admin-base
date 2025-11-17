import { anyOf, authorize, has } from '@server/services/auth/authorization';
import { userService } from '@server/services/user.service';
import type { AppAuthMeta } from '@server/share';
import { castToRes, ResWrapper } from '@server/share';
import { Elysia, t } from 'elysia';
import {
  ListUsersQueryDto,
  UpsertUserDto,
  UserListResponseDto,
  UserResDto,
  UserStatisticsQueryDto,
  UserStatisticsResponseDto,
} from '../../dto/admin';

export const userController = new Elysia<'users', AppAuthMeta>({
  prefix: 'users',
})
  .use(authorize(anyOf(has('USER.VIEW'), has('USER.VIEW_ALL'))))
  .get(
    '/',
    async ({ query }) => {
      const result = await userService.listUsersAdmin(query);
      return castToRes(result);
    },
    {
      query: ListUsersQueryDto,
      response: {
        200: ResWrapper(UserListResponseDto),
      },
    },
  )
  .get(
    '/:id',
    async ({ params }) => {
      const result = await userService.getUserByIdAdmin(params.id);
      return castToRes(result);
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: ResWrapper(UserResDto),
      },
    },
  )
  .get(
    '/statistics',
    async ({ query }) => {
      const result = await userService.getUserStatistics(query);
      return castToRes(result);
    },
    {
      query: UserStatisticsQueryDto,
      response: {
        200: ResWrapper(UserStatisticsResponseDto),
      },
    },
  )
  .use(authorize(has('USER.UPDATE')))
  .post(
    '/',
    async ({ body }) => {
      await userService.upsertUserAdmin(body);
      return castToRes(null);
    },
    {
      body: UpsertUserDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ResWrapper(t.Null()),
      },
    },
  )
  .use(authorize(has('USER.DELETE')))
  .post(
    '/del',
    async ({ body: { ids } }) => {
      await userService.deleteUsersAdmin(ids);
      return castToRes(null);
    },
    {
      body: t.Object({ ids: t.Array(t.String(), { minItems: 1 }) }),
      response: {
        200: ResWrapper(t.Null()),
        400: ResWrapper(t.Null()),
      },
    },
  );
