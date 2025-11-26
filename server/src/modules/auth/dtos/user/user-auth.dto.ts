import { t } from 'elysia';
import { UserStatus } from 'src/generated';
import { LoginResType } from 'src/share';

export const UserResDto = t.Object({
  id: t.String(),
  email: t.String(),
  mfaTotpEnabled: t.Boolean(),
  status: t.Enum(UserStatus),
  created: t.Date({ format: 'date-time' }),
  modified: t.Date({ format: 'date-time' }),
  permissions: t.Array(t.String()),
});

export const LoginResDto = t.Object({
  type: t.Literal(LoginResType.COMPLETED),
  accessToken: t.String(),
  refreshToken: t.String(),
  exp: t.Number(),
  expired: t.String(),
  user: UserResDto,
});

export type ILoginRes = typeof LoginResDto.static;

export const LoginMFASetupResDto = t.Object({
  type: t.Literal(LoginResType.MFA_SETUP),
  mfaToken: t.String(),
  totpSecret: t.String(),
});

export const LoginMFAResDto = t.Object({
  type: t.Literal(LoginResType.MFA_CONFIRM),
  mfaToken: t.String(),
  loginToken: t.String(),
});

export const LoginResponseDto = t.Union([
  LoginResDto,
  LoginMFASetupResDto,
  LoginMFAResDto,
]);

export type ILoginResponse = typeof LoginResponseDto.static;
