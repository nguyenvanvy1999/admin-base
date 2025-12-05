import { Elysia, t } from 'elysia';
import {
  CreateNotificationDto,
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from 'src/modules/admin/dtos/notification.dto';
import { notificationAdminService } from 'src/service/admin';
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

export const adminNotificationController = new Elysia<
  'admin-notification',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_NOTIFICATION],
}).group('/notifications', (app) =>
  app
    .get(
      '/',
      async ({ query, currentUser }) => {
        const restrictToUserId = !currentUser.permissions.includes(
          'NOTIFICATION.VIEW',
        )
          ? currentUser.id
          : undefined;

        if (restrictToUserId) {
          query.userIds = [currentUser.id];
        }

        return castToRes(
          await notificationAdminService.list(query, restrictToUserId),
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
        const restrictToUserId = !currentUser.permissions.includes(
          'NOTIFICATION.VIEW',
        )
          ? currentUser.id
          : undefined;

        const result = await notificationAdminService.detail(
          id,
          restrictToUserId,
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
      '/',
      async ({ body, currentUser }) => {
        if (!currentUser.permissions.includes('NOTIFICATION.CREATE')) {
          throw new UnAuthErr(ErrCode.PermissionDenied);
        }

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
    .post(
      '/del',
      async ({ body, currentUser }) => {
        const restrictToUserId = !currentUser.permissions.includes(
          'NOTIFICATION.DELETE',
        )
          ? currentUser.id
          : undefined;

        await notificationAdminService.removeMany(body.ids, restrictToUserId);
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
    .post(
      '/mark-read',
      async ({ body, currentUser }) => {
        const restrictToUserId = !currentUser.permissions.includes(
          'NOTIFICATION.UPDATE',
        )
          ? currentUser.id
          : undefined;

        await notificationAdminService.markAsRead(body.ids, restrictToUserId);
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
