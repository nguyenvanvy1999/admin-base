import { t } from 'elysia';

export const UserIpWhitelistDto = t.Object({
  id: t.String(),
  userId: t.String(),
  ip: t.String(),
  created: t.Date(),
});

export const CreateUserIpWhitelistDto = t.Object({
  ip: t.String(),
});

export const UserIpWhitelistResponseDto = t.Object({
  id: t.String(),
  ip: t.String(),
  created: t.Date(),
});
