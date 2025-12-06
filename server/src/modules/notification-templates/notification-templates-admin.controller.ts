import { Elysia, t } from 'elysia';
import { notificationTemplateAdminService } from 'src/service/admin';
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
  NotificationTemplateDetailResDto,
  NotificationTemplatePaginationDto,
  PaginateNotificationTemplateResDto,
  UpsertNotificationTemplateDto,
} from './notification-templates.dto';

export const notificationTemplatesAdminController = new Elysia({
  prefix: '/admin/notification-templates',
  tags: [DOC_TAG.ADMIN_NOTIFICATION_TEMPLATE],
})
  .use(authCheck)
  .use(authorize(has('NOTIFICATION_TEMPLATE.VIEW')))
  .get(
    '/',
    async ({ query }) =>
      castToRes(await notificationTemplateAdminService.list(query)),
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
      const result = await notificationTemplateAdminService.detail(id);
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
      await notificationTemplateAdminService.upsert(body);
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
      await notificationTemplateAdminService.removeMany(body);
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
