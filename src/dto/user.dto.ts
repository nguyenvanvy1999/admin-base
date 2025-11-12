import { UserRole } from '@server/generated/prisma/enums';
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

export const AuthUserDto = t.NoValidate(
  t.Object({
    id: t.String(),
    username: t.String(),
    name: t.Nullable(t.String()),
    role: t.Enum(UserRole),
    baseCurrencyId: t.Nullable(t.String()),
  }),
);
export type AuthUserRes = typeof AuthUserDto.static;

export const LoginResponseDto = t.NoValidate(
  t.Object({
    user: AuthUserDto,
    jwt: t.String(),
  }),
);
export type LoginRes = typeof LoginResponseDto.static;

export type CurrentUserRes = typeof AuthUserDto.static;

export type RegisterRes = typeof AuthUserDto.static;

export type UpdateProfileRes = typeof AuthUserDto.static;
