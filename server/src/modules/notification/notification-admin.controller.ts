import { Elysia, t } from 'elysia';
import {
  CreateNotificationDto,
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from 'src/dtos/notification.dto';
import { authCheck, authorize, has } from 'src/services/auth';
import { notificationsService } from 'src/services/notifications';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const notificationAdminController = new Elysia({
  prefix: '/admin/notifications',
  tags: [DOC_TAG.ADMIN_NOTIFICATION],
})
  .use(authCheck)
  .use(authorize(has('NOTIFICATION.VIEW')))
  .get(
    '/',
    async ({ query, currentUser }) => {
      return castToRes(
        await notificationsService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission: true,
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
        hasViewPermission: true,
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
  .use(authorize(has('NOTIFICATION.UPDATE')))
  .post(
    '/',
    async ({ body }) => {
      const result = await notificationsService.create(body);
      return castToRes(result);
    },
    {
      body: CreateNotificationDto,
      response: {
        200: ResWrapper(t.Object({ id: t.String() })),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('NOTIFICATION.DELETE')))
  .post(
    '/del',
    async ({ body, currentUser }) => {
      await notificationsService.removeMany(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission: true,
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
  )
  .use(authorize(has('NOTIFICATION.UPDATE')))
  .post(
    '/mark-read',
    async ({ body, currentUser }) => {
      await notificationsService.markAsRead(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission: true,
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
  );
