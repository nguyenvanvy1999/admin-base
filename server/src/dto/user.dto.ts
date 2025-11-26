import { t } from 'elysia';
import { z } from 'zod';

export const RegisterDto = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  name: z.string().optional(),
  baseCurrencyId: z.string().min(1),
});

export const LoginDto = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const UpdateProfileDto = z.object({
  name: z.string().optional(),
});

export const ChangePasswordDto = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type IRegisterDto = z.infer<typeof RegisterDto>;
export type ILoginDto = z.infer<typeof LoginDto>;
export type IUpdateProfileDto = z.infer<typeof UpdateProfileDto>;
export type IChangePasswordDto = z.infer<typeof ChangePasswordDto>;

export const AuthUserDto = t.NoValidate(
  t.Object({
    id: t.String(),
    username: t.String(),
    name: t.Nullable(t.String()),
    baseCurrencyId: t.Nullable(t.String()),
    permissions: t.Array(t.String()),
    roleIds: t.Array(t.String()),
    isSuperAdmin: t.Boolean(),
  }),
);
export type AuthUserRes = typeof AuthUserDto.static;

export const LoginResponseDto = t.NoValidate(
  t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
    exp: t.Number(),
    expired: t.String(),
    user: AuthUserDto,
  }),
);
export type LoginRes = typeof LoginResponseDto.static;

export type CurrentUserRes = typeof AuthUserDto.static;

export type RegisterRes = typeof AuthUserDto.static;

export type UpdateProfileRes = typeof AuthUserDto.static;
