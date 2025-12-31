import { t } from 'elysia';
import { DtoFields } from 'src/share';
import { BaseUserDto } from './users.dto';

export const OtpResDto = t.Union([
  t.Null(),
  t.Object({ otpToken: t.String() }),
]);

export const LoginRequestDto = t.Object({
  email: DtoFields.email,
  password: t.String({ minLength: 1 }),
});

export const RegisterRequestDto = t.Object({
  email: DtoFields.email,
  password: DtoFields.password,
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

export const UserResDto = t.Composite([
  t.Pick(BaseUserDto, ['id', 'email', 'status', 'created', 'modified']),
  t.Object({
    mfaTotpEnabled: t.Boolean(),
    permissions: t.Array(t.String()),
  }),
]);

export const LoginResDto = t.Object({
  type: t.Literal('completed'),
  accessToken: t.String(),
  refreshToken: t.String(),
  exp: t.Number(),
  expired: t.String(),
  user: UserResDto,
  sessionId: t.String(),
});

export type ILoginRes = typeof LoginResDto.static;

export type LoginParams = typeof LoginRequestDto.static;
export type RegisterParams = typeof RegisterRequestDto.static;
export type ChangePasswordParams = {
  userId: string;
} & typeof ChangePasswordRequestDto.static;
export type ForgotPasswordParams = typeof ForgotPasswordRequestDto.static;
export type VerifyAccountParams = typeof VerifyAccountRequestDto.static;
export type RefreshTokenParams = typeof RefreshTokenRequestDto.static;
export type LogoutParams = { id: string; sessionId: string };

export type GoogleLoginParams = typeof GoogleLoginRequestDto.static;
export type LinkTelegramParams = {
  userId: string;
  telegramData: typeof LinkTelegramRequestDto.static;
};

export const ChallengeDto = t.Union([
  t.Object({ type: t.Literal('MFA_TOTP'), allowBackupCode: t.Literal(true) }),
  t.Object({ type: t.Literal('MFA_BACKUP_CODE') }),
  t.Object({
    type: t.Literal('MFA_ENROLL'),
    methods: t.Array(t.Literal('totp')),
    backupCodesWillBeGenerated: t.Boolean(),
  }),
]);

export const AuthCompletedResponseDto = t.Object({
  status: t.Literal('COMPLETED'),
  session: LoginResDto,
  backupCodes: t.Optional(t.Array(t.String())),
});

export const AuthChallengeResponseDto = t.Object({
  status: t.Literal('CHALLENGE'),
  authTxId: t.String(),
  challenge: ChallengeDto,
});

export const AuthResponseDto = t.Union([
  AuthCompletedResponseDto,
  AuthChallengeResponseDto,
]);

export type IAuthResponse = typeof AuthResponseDto.static;

export const AuthChallengeRequestDto = t.Object({
  authTxId: t.String({ minLength: 1 }),
  type: t.Union([t.Literal('MFA_TOTP'), t.Literal('MFA_BACKUP_CODE')]),
  code: t.String({ minLength: 1 }),
});
export type AuthChallengeRequestParams = typeof AuthChallengeRequestDto.static;

export const AuthEnrollStartRequestDto = t.Object({
  authTxId: t.String({ minLength: 1 }),
});
export type AuthEnrollStartRequestParams =
  typeof AuthEnrollStartRequestDto.static;

export const AuthEnrollStartResponseDto = t.Object({
  authTxId: t.String(),
  enrollToken: t.String(),
  otpauthUrl: t.String(),
});

export const AuthEnrollConfirmRequestDto = t.Object({
  authTxId: t.String({ minLength: 1 }),
  enrollToken: t.String({ minLength: 1 }),
  otp: t.String({ minLength: 6, maxLength: 6 }),
});
export type AuthEnrollConfirmRequestParams =
  typeof AuthEnrollConfirmRequestDto.static;
