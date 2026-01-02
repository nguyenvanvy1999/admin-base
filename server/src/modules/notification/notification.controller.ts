import { Elysia, t } from 'elysia';
import {
  CreateNotificationDto,
  MarkNotificationReadDto,
  NotificationDetailResDto,
  NotificationPaginationDto,
  PaginateNotificationResDto,
} from 'src/dtos/notification.dto';
import { authCheck } from 'src/services/auth';
import { notificationsService } from 'src/services/notifications/notifications.service';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrCode,
  ErrorResDto,
  type ICurrentUser,
  IdDto,
  IdsDto,
  ResWrapper,
  UnAuthErr,
} from 'src/share';

const canNotificationView = (user: ICurrentUser) =>
  user.permissions.includes('NOTIFICATION.VIEW');

const canNotificationUpdate = (user: ICurrentUser) =>
  user.permissions.includes('NOTIFICATION.UPDATE');

const canNotificationDelete = (user: ICurrentUser) =>
  user.permissions.includes('NOTIFICATION.DELETE');

export const notificationController = new Elysia({
  prefix: '/notifications',
  tags: [DOC_TAG.NOTIFICATION],
  detail: { security: ACCESS_AUTH },
})
  .use(authCheck)
  .get(
    '/',
    async ({ query, currentUser }) => {
      const hasViewPermission = canNotificationView(currentUser);

      return castToRes(
        await notificationsService.list({
          ...query,
          currentUserId: currentUser.id,
          hasViewPermission,
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
      const hasViewPermission = canNotificationView(currentUser);

      const result = await notificationsService.detail(id, {
        currentUserId: currentUser.id,
        hasViewPermission,
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
    '/',
    async ({ body, currentUser }) => {
      if (!canNotificationUpdate(currentUser)) {
        throw new UnAuthErr(ErrCode.PermissionDenied);
      }

      await notificationsService.create(
        body as typeof CreateNotificationDto.static,
      );
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
      const hasViewPermission = canNotificationDelete(currentUser);

      await notificationsService.removeMany(
        (body as typeof IdsDto.static).ids,
        {
          currentUserId: currentUser.id,
          hasViewPermission,
        },
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
  )
  .post(
    '/mark-read',
    async ({ body, currentUser }) => {
      const hasViewPermission = canNotificationUpdate(currentUser);

      await notificationsService.markAsRead(
        (body as typeof MarkNotificationReadDto.static).ids,
        {
          currentUserId: currentUser.id,
          hasViewPermission,
        },
      );
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
