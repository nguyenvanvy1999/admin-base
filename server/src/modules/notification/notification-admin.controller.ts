import { Elysia, t } from 'elysia';
import { notificationAdminService } from 'src/service/admin';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
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
  CreateNotificationDto,
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from './notification.dto';

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
        await notificationAdminService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission:
            currentUser.permissions.includes('NOTIFICATION.VIEW'),
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
        hasViewPermission:
          currentUser.permissions.includes('NOTIFICATION.VIEW'),
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
    async ({ body, currentUser }) => {
      await notificationAdminService.removeMany(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission: currentUser.permissions.includes(
          'NOTIFICATION.DELETE',
        ),
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
      await notificationAdminService.markAsRead(body.ids, {
        currentUserId: currentUser.id,
        hasViewPermission: currentUser.permissions.includes(
          'NOTIFICATION.UPDATE',
        ),
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
