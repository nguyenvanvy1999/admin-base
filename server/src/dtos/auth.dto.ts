import { t } from 'elysia';
import { UserStatus } from 'src/generated';
import { LoginResType } from 'src/share';

export const OtpResDto = t.Union([
  t.Null(),
  t.Object({ otpToken: t.String() }),
]);

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
  setupToken: t.String(),
});

export const LoginMFAResDto = t.Object({
  type: t.Literal(LoginResType.MFA_CONFIRM),
  mfaToken: t.String(),
});

export const LoginResponseDto = t.Union([
  LoginResDto,
  LoginMFASetupResDto,
  LoginMFAResDto,
]);

export type ILoginResponse = typeof LoginResponseDto.static;

export const GenerateBackupCodesRequestDto = t.Object({
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const SetupMfaRequestDto = t.Object({
  setupToken: t.Optional(t.String({ minLength: 1 })),
});

export const SetupMfaConfirmDto = t.Object({
  mfaToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const ResetMfaRequestDto = t.Object({
  otpToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});

export const VerifyBackupCodeRequestDto = t.Object({
  backupCode: t.String({ minLength: 8, maxLength: 8 }),
  mfaToken: t.String({ minLength: 1 }),
});

export const DisableMfaRequestDto = t.Object({
  otp: t.Optional(t.String({ minLength: 6, maxLength: 6 })),
  backupCode: t.Optional(t.String({ minLength: 8, maxLength: 8 })),
});

export const MfaStatusResponseDto = t.Object({
  enabled: t.Boolean(),
  hasBackupCodes: t.Boolean(),
  backupCodesRemaining: t.Number(),
});

export const BackupCodesResponseDto = t.Object({
  codes: t.Array(t.String()),
  message: t.String(),
});

export const BackupCodesRemainingResponseDto = t.Object({
  remaining: t.Number(),
  total: t.Number(),
});

export type LoginParams = typeof LoginRequestDto.static;
export type RegisterParams = typeof RegisterRequestDto.static;
export type ChangePasswordParams = {
  userId: string;
} & typeof ChangePasswordRequestDto.static;
export type ForgotPasswordParams = typeof ForgotPasswordRequestDto.static;
export type VerifyAccountParams = typeof VerifyAccountRequestDto.static;
export type RefreshTokenParams = typeof RefreshTokenRequestDto.static;
export type LogoutParams = { id: string; sessionId: string };
export type ConfirmMfaLoginParams = typeof ConfirmMfaLoginRequestDto.static;
export type LoginWithMfaParams = typeof MfaLoginRequestDto.static;
export type SetupMfaRequestParams = typeof SetupMfaRequestDto.static;
export type SetupMfaParams = typeof SetupMfaConfirmDto.static;
export type ResetMfaParams = typeof ResetMfaRequestDto.static;
export type GoogleLoginParams = typeof GoogleLoginRequestDto.static;
export type LinkTelegramParams = {
  userId: string;
  telegramData: typeof LinkTelegramRequestDto.static;
};
export type VerifyAndCompleteLoginParams =
  | typeof MfaLoginRequestDto.static
  | typeof VerifyBackupCodeRequestDto.static;
