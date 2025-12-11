import { t } from 'elysia';
import { DtoFields, PaginationReqDto } from 'src/share';

export const UpsertIpWhitelistDto = t.Object({
  id: t.Optional(t.String()),
  ip: t.String({ minLength: 1 }),
  userId: t.String({ minLength: 1 }),
  note: t.Optional(t.String()),
});

export const IpWhitelistItemDto = t.Object({
  id: t.String(),
  ip: t.String(),
  userId: t.String(),
  note: t.Nullable(t.String()),
  created: t.Date(),
});

export const PaginateIpWhitelistResDto = t.Object({
  docs: t.Array(IpWhitelistItemDto),
  count: t.Number(),
});

export const IpWhitelistDetailResDto = t.Intersect([
  IpWhitelistItemDto,
  t.Object({
    user: t.Optional(
      t.Object({
        id: t.String(),
        email: t.String(),
      }),
    ),
  }),
]);

export const IpWhitelistPaginationDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    userId: t.Optional(t.String()),
    userIds: t.Optional(t.Array(t.String())),
    ip: t.Optional(t.String()),
    search: DtoFields.search,
  }),
]);
