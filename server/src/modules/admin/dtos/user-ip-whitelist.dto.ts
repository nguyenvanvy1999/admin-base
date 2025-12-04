import { t } from 'elysia';
import { PaginationReqDto } from 'src/share';

export const UserIpWhitelistDto = t.Object({
  id: t.String(),
  userId: t.String(),
  ip: t.String(),
  created: t.Date(),
});

export const UserIpWhitelistListQueryDto = t.Composite([
  PaginationReqDto,
  t.Object({
    userIds: t.Optional(t.String()),
    ip: t.Optional(t.String()),
  }),
]);

export const CreateUserIpWhitelistDto = t.Object({
  ip: t.String(),
  userId: t.String(),
  note: t.Optional(t.String()),
});

export const DeleteUserIpWhitelistDto = t.Object({
  ids: t.Array(t.String()),
});

export const UserIpWhitelistResponseDto = t.Object({
  id: t.String(),
  ip: t.String(),
  userId: t.String(),
  created: t.Date(),
});
