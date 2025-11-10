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

const authUserShape = {
  id: t.String(),
  username: t.String(),
  name: t.Nullable(t.String()),
  role: t.Enum(UserRole),
  baseCurrencyId: t.Nullable(t.String()),
} as const;

export const AuthUserDto = t.Object(authUserShape);
export type AuthUserResponse = typeof AuthUserDto.static;

export const LoginResponseDto = t.Object({
  user: AuthUserDto,
  jwt: t.String(),
});
export type LoginResponse = typeof LoginResponseDto.static;

export const CurrentUserResponseDto = AuthUserDto;
export type CurrentUserResponse = typeof CurrentUserResponseDto.static;

export const RegisterResponseDto = AuthUserDto;
export type RegisterResponse = typeof RegisterResponseDto.static;

export const UpdateProfileResponseDto = AuthUserDto;
export type UpdateProfileResponse = typeof UpdateProfileResponseDto.static;
