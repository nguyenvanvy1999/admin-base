import { Elysia, t } from 'elysia';
import {
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from 'src/dtos/notification.dto';
import { authCheck } from 'src/service/auth/middleware';
import { notificationsService } from 'src/service/notifications';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const notificationUserController = new Elysia({
  prefix: '/notifications',
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      return castToRes(
        await notificationsService.list({
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
      const result = await notificationsService.detail(id, {
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
      await notificationsService.markAsRead(body.ids, {
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
      await notificationsService.removeMany(body.ids, {
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
