import { Elysia, t } from 'elysia';
import {
  NotificationTemplateDetailResDto,
  NotificationTemplatePaginationDto,
  PaginateNotificationTemplateResDto,
  UpsertNotificationTemplateDto,
} from 'src/dtos/notification-templates.dto';
import { authCheck, authorize, has } from 'src/services/auth';
import { notificationTemplatesService } from 'src/services/notifications/notification-templates.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const notificationTemplatesAdminController = new Elysia({
  prefix: '/admin/notification-templates',
  tags: [DOC_TAG.ADMIN_NOTIFICATION_TEMPLATE],
})
  .use(authCheck)
  .use(authorize(has('NOTIFICATION_TEMPLATE.VIEW')))
  .get(
    '/',
    async ({ query }) =>
      castToRes(await notificationTemplatesService.list(query)),
    {
      query: NotificationTemplatePaginationDto,
      response: {
        200: ResWrapper(PaginateNotificationTemplateResDto),
        ...authErrors,
      },
    },
  )
  .get(
    '/:id',
    async ({ params: { id } }) => {
      const result = await notificationTemplatesService.detail(id);
      return castToRes(result);
    },
    {
      params: IdDto,
      response: {
        200: ResWrapper(NotificationTemplateDetailResDto),
        400: ErrorResDto,
        404: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('NOTIFICATION_TEMPLATE.UPDATE')))
  .post(
    '/',
    async ({ body }) => {
      await notificationTemplatesService.upsert(body);
      return castToRes(null);
    },
    {
      body: UpsertNotificationTemplateDto,
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        ...authErrors,
      },
    },
  )
  .use(authorize(has('NOTIFICATION_TEMPLATE.DELETE')))
  .post(
    '/del',
    async ({ body }) => {
      await notificationTemplatesService.removeMany(body);
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
