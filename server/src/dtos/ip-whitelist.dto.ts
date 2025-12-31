import { t } from 'elysia';
import {
  DtoFields,
  PaginatedDto,
  PaginationReqDto,
  UpsertBaseDto,
  UserFilterDto,
  UserInfoDto,
  type WithPermissionContext,
} from 'src/share';

export const UpsertIpWhitelistDto = t.Intersect([
  UpsertBaseDto,
  t.Object({
    ip: t.String({ minLength: 1 }),
    userId: t.String({ minLength: 1 }),
    note: t.Optional(t.String()),
  }),
]);

export const IpWhitelistItemDto = t.Object({
  id: t.String(),
  ip: t.String(),
  userId: t.String(),
  note: t.Nullable(t.String()),
  created: t.Date(),
});

export const PaginateIpWhitelistResDto = PaginatedDto(IpWhitelistItemDto);

export const IpWhitelistDetailResDto = t.Intersect([
  IpWhitelistItemDto,
  t.Object({
    user: t.Optional(t.Pick(UserInfoDto, ['id', 'email'])),
  }),
]);

export const IpWhitelistPaginationDto = t.Intersect([
  PaginationReqDto,
  UserFilterDto,
  t.Object({
    ip: t.Optional(t.String()),
    search: DtoFields.search,
  }),
]);

export type IpWhitelistListParams = WithPermissionContext<
  typeof IpWhitelistPaginationDto.static
>;

export type UpsertIpWhitelistParams = typeof UpsertIpWhitelistDto.static;
