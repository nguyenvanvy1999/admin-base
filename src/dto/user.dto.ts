import { t } from 'elysia';

export const RegisterDto = t.Object({
  username: t.String(),
  password: t.String({ minLength: 6 }),
  name: t.Optional(t.String()),
});

export const LoginDto = t.Object({
  username: t.String(),
  password: t.String(),
});

export const UpdateProfileDto = t.Object({
  name: t.Optional(t.String()),
  baseCurrencyId: t.Optional(t.String()),
  oldPassword: t.Optional(t.String()),
  newPassword: t.Optional(t.String({ minLength: 6 })),
});

export type IRegisterDto = typeof RegisterDto.static;
export type ILoginDto = typeof LoginDto.static;
export type IUpdateProfileDto = typeof UpdateProfileDto.static;
