import { t } from 'elysia';
import { DtoFields, PaginationReqDto } from 'src/share';

export const UpsertUserIpWhitelistDto = t.Object({
  id: t.Optional(t.String()),
  ip: t.String({ minLength: 1 }),
  userId: t.String({ minLength: 1 }),
  note: t.Optional(t.String()),
});

export const UserIpWhitelistItemDto = t.Object({
  id: t.String(),
  ip: t.String(),
  userId: t.String(),
  note: t.Nullable(t.String()),
  created: t.Date(),
});

export const PaginateUserIpWhitelistResDto = t.Object({
  docs: t.Array(UserIpWhitelistItemDto),
  count: t.Number(),
});

export const UserIpWhitelistDetailResDto = t.Intersect([
  UserIpWhitelistItemDto,
  t.Object({
    user: t.Optional(
      t.Object({
        id: t.String(),
        email: t.String(),
      }),
    ),
  }),
]);

export const UserIpWhitelistPaginationDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    userId: t.Optional(t.String()),
    userIds: t.Optional(t.Array(t.String())),
    ip: t.Optional(t.String()),
    search: DtoFields.search,
  }),
]);
