import { t } from 'elysia';
import { NotificationStatus, NotificationType } from 'src/generated';
import {
  DtoFields,
  PaginatedDto,
  PaginationReqDto,
  UserFilterDto,
  UserInfoDto,
  type WithPermissionContext,
} from 'src/share';

export const CreateNotificationDto = t.Object({
  userId: t.String({ minLength: 1 }),
  templateId: t.Optional(t.String()),
  type: t.Enum(NotificationType),
  subject: t.Optional(t.String()),
  content: t.String({ minLength: 1 }),
  metadata: t.Optional(t.Any()),
});

export const NotificationItemDto = t.Object({
  id: t.String(),
  userId: t.String(),
  templateId: t.Nullable(t.String()),
  type: t.Enum(NotificationType),
  status: t.Enum(NotificationStatus),
  subject: t.Nullable(t.String()),
  content: t.String(),
  metadata: t.Nullable(t.Any()),
  readAt: t.Nullable(t.Date()),
  sentAt: t.Nullable(t.Date()),
  failedAt: t.Nullable(t.Date()),
  error: t.Nullable(t.String()),
  created: t.Date(),
});

export const PaginateNotificationResDto = PaginatedDto(NotificationItemDto);

export const NotificationDetailResDto = t.Intersect([
  NotificationItemDto,
  t.Object({
    user: t.Optional(t.Pick(UserInfoDto, ['id', 'email'])),
  }),
]);

export const NotificationPaginationDto = t.Intersect([
  PaginationReqDto,
  UserFilterDto,
  t.Object({
    type: t.Optional(t.Enum(NotificationType)),
    status: t.Optional(t.Enum(NotificationStatus)),
    search: DtoFields.search,
  }),
]);

export const MarkNotificationReadDto = t.Object({
  ids: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
});

export type NotificationListParams = WithPermissionContext<
  typeof NotificationPaginationDto.static
>;

export type CreateNotificationParams = typeof CreateNotificationDto.static;
