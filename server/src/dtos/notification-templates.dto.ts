import { t } from 'elysia';
import { NotificationType } from 'src/generated';
import { DtoFields, PaginationReqDto } from 'src/share';

export const UpsertNotificationTemplateDto = t.Object({
  id: t.Optional(t.String()),
  code: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  subject: t.Optional(t.String()),
  body: t.String({ minLength: 1 }),
  type: t.Enum(NotificationType),
  variables: t.Optional(t.Any()),
  enabled: t.Optional(t.Boolean()),
});

export const NotificationTemplateItemDto = t.Object({
  id: t.String(),
  code: t.String(),
  name: t.String(),
  subject: t.Nullable(t.String()),
  body: t.String(),
  type: t.Enum(NotificationType),
  variables: t.Nullable(t.Any()),
  enabled: t.Boolean(),
  created: t.Date(),
  modified: t.Date(),
});

export const PaginateNotificationTemplateResDto = t.Object({
  docs: t.Array(NotificationTemplateItemDto),
  count: t.Number(),
});

export const NotificationTemplateDetailResDto = t.Intersect([
  NotificationTemplateItemDto,
  t.Object({
    _count: t.Optional(
      t.Object({
        notifications: t.Number(),
      }),
    ),
  }),
]);

export const NotificationTemplatePaginationDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    type: t.Optional(t.Enum(NotificationType)),
    enabled: t.Optional(t.Boolean()),
    search: DtoFields.search,
  }),
]);
