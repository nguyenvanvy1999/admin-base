import { Elysia, t } from 'elysia';
import {
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from 'src/modules/admin/dtos/notification.dto';
import { notificationAdminService } from 'src/service/admin';
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

export const userNotificationController = new Elysia<
  'user-notification',
  AppAuthMeta
>({
  tags: [DOC_TAG.MISC],
})
  .use(authCheck)
  .group('/notifications', (app) =>
    app
      .get(
        '/',
        async ({ query, currentUser }) => {
          query.userIds = [currentUser.id];
          return castToRes(
            await notificationAdminService.list(query, currentUser.id),
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
          const result = await notificationAdminService.detail(
            id,
            currentUser.id,
          );
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
          await notificationAdminService.markAsRead(body.ids, currentUser.id);
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
          await notificationAdminService.removeMany(body.ids, currentUser.id);
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
