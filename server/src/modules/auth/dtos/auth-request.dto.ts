import { t } from 'elysia';

export const LoginRequestDto = t.Object({
  email: t.String({ minLength: 1, format: 'email' }),
  password: t.String({ minLength: 1 }),
});

export const RegisterRequestDto = t.Object({
  email: t.String({ minLength: 1, format: 'email' }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

export const ChangePasswordRequestDto = t.Object({
  oldPassword: t.Optional(t.String({})),
  newPassword: t.String({ minLength: 1 }),
});

export const ForgotPasswordRequestDto = t.Object({
  otp: t.String({ minLength: 1 }),
  otpToken: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 1 }),
});

export const VerifyAccountRequestDto = t.Object({
  otp: t.String({ minLength: 6, maxLength: 6 }),
  otpToken: t.String({ minLength: 1 }),
});

export const RefreshTokenRequestDto = t.Object({
  token: t.String({ minLength: 1 }),
});

export const ConfirmMfaLoginRequestDto = t.Object({
  mfaToken: t.String({ minLength: 1 }),
  loginToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const MfaLoginRequestDto = t.Object({
  mfaToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const ReferralRequestDto = t.Object({
  refCode: t.String({ minLength: 1 }),
});

export const GoogleLoginRequestDto = t.Object({
  idToken: t.String({ minLength: 1 }),
});

export const LinkTelegramRequestDto = t.Object({
  id: t.String(),
  first_name: t.Optional(t.String()),
  last_name: t.Optional(t.String()),
  username: t.Optional(t.String()),
  photo_url: t.Optional(t.String()),
  auth_date: t.String(),
  hash: t.String(),
});
