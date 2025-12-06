import { Elysia, t } from 'elysia';
import { notificationAdminService } from 'src/service/admin';
import { authorize, has } from 'src/service/auth/authorization';
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
  CreateNotificationDto,
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from './notification.dto';

export const notificationAdminController = new Elysia<
  'notification-admin',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_NOTIFICATION],
}).group('/admin/notifications', (app) =>
  app
    .use(authorize(has('NOTIFICATION.VIEW')))
    .get(
      '/',
      async ({ query }) => {
        return castToRes(await notificationAdminService.list(query));
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
      async ({ params: { id } }) => {
        const result = await notificationAdminService.detail(id);
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
    .use(authorize(has('NOTIFICATION.CREATE')))
    .post(
      '/',
      async ({ body }) => {
        await notificationAdminService.create(body);
        return castToRes(null);
      },
      {
        body: CreateNotificationDto,
        response: {
          200: ResWrapper(t.Null()),
          400: ErrorResDto,
          ...authErrors,
        },
      },
    )
    .use(authorize(has('NOTIFICATION.DELETE')))
    .post(
      '/del',
      async ({ body }) => {
        await notificationAdminService.removeMany(body.ids);
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
    )
    .use(authorize(has('NOTIFICATION.UPDATE')))
    .post(
      '/mark-read',
      async ({ body }) => {
        await notificationAdminService.markAsRead(body.ids);
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
    ),
);
