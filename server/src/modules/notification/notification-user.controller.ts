import { Elysia, t } from 'elysia';
import { notificationAdminService } from 'src/service/admin';
import { authCheck } from 'src/service/auth/auth.middleware';
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
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from './notification.dto';

export const notificationUserController = new Elysia({
  prefix: '/notifications',
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      return castToRes(
        await notificationAdminService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission: false,
        }),
      );
    },
    {
      query: NotificationPaginationDto,
      response: {
        200: ResWrapper(PaginateNotificationResDto),
        ...authErrors,
      },
    },
  )
  .get(
    '/:id',
    async ({ params: { id }, currentUser }) => {
      const result = await notificationAdminService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission: false,
      });
      return castToRes(result);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(NotificationDetailResDto),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .post(
    '/mark-read',
    async ({ body, currentUser }) => {
      await notificationAdminService.markAsRead(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission: false,
      });
      return castToRes(null);
    },
    {
      body: MarkNotificationReadDto,
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
      await notificationAdminService.removeMany(body.ids, {
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
