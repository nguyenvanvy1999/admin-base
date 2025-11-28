import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import {
  ChangePasswordRequestDto,
  ConfirmMfaLoginRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  LoginResDto,
  LoginResponseDto,
  MfaLoginRequestDto,
  OtpResDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  UserResDto,
  VerifyAccountRequestDto,
} from 'src/modules/auth/dtos';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authService } from 'src/service/auth/auth.service';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

export const authBaseController = new Elysia({
  prefix: '/auth',
  tags: ['auth'],
})
  .use(reqMeta)
  .post(
    '/login',
    async ({ body: { email, password } }) => {
      const result = await authService.login({
        email,
        password,
      });
      return castToRes(result);
    },
    {
      body: LoginRequestDto,
      detail: {
        description: 'Login with email and password',
        summary: 'Login a user',
      },
      response: {
        200: ResWrapper(LoginResponseDto),
        400: ErrorResDto,
        404: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .post(
    '/login/mfa/confirm',
    async ({ body: { mfaToken, loginToken, otp } }) => {
      const result = await authService.confirmMfaLogin({
        mfaToken,
        loginToken,
        otp,
      });
      return castToRes(result);
    },
    {
      body: ConfirmMfaLoginRequestDto,
      detail: {
        description: 'Confirm MFA login with OTP (legacy API)',
        summary: 'Confirm MFA login',
      },
      response: {
        200: ResWrapper(LoginResDto),
        400: ErrorResDto,
        404: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .post(
    '/login/mfa',
    async ({ body: { mfaToken, otp } }) => {
      const result = await authService.loginWithMfa({
        mfaToken,
        otp,
      });
      return castToRes(result);
    },
    {
      body: MfaLoginRequestDto,
      detail: {
        description: 'Login with MFA token and OTP',
        summary: 'Login with MFA',
      },
      response: {
        200: ResWrapper(LoginResDto),
        400: ErrorResDto,
        404: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .post(
    '/refresh-token',
    async ({ body: { token } }) => {
      const result = await authService.refreshToken({
        token,
      });
      return castToRes(result);
    },
    {
      body: RefreshTokenRequestDto,
      response: {
        200: ResWrapper(LoginResDto),
        ...authErrors,
      },
      detail: {
        summary: 'Refresh access token',
        description: 'Issues a new access token using a valid refresh token.',
        security: ACCESS_AUTH,
      },
    },
  )
  .use(authCheck)
  .post(
    '/logout',
    async ({ currentUser }) => {
      await authService.logout({
        userId: currentUser.id,
        sessionId: currentUser.sessionId,
      });
      return castToRes(null);
    },
    {
      response: {
        200: ResWrapper(t.Null()),
        ...authErrors,
      },
      detail: {
        summary: 'Log out from current device',
        description: 'Logs out and invalidates the current user session.',
        security: ACCESS_AUTH,
      },
    },
  )
  .post(
    '/logout/all',
    async ({ currentUser }) => {
      await authService.logoutAll({
        userId: currentUser.id,
        sessionId: currentUser.sessionId,
      });
      return castToRes(null);
    },
    {
      response: {
        200: ResWrapper(t.Null()),
        ...authErrors,
      },
      detail: {
        summary: 'Log out from all devices',
        description:
          'Logs out and invalidates all active sessions for the current user.',
        security: ACCESS_AUTH,
      },
    },
  )

  .get(
    '/me',
    async ({ currentUser }) => {
      const user = await authService.getProfile(currentUser.id);
      return castToRes(user);
    },
    {
      response: {
        200: ResWrapper(UserResDto),
        ...authErrors,
      },
      detail: {
        summary: 'Get current user profile',
        description:
          'Retrieves the profile information of the currently authenticated user.',
        security: ACCESS_AUTH,
      },
    },
  )
  .post(
    '/change-password',
    async ({ body: { newPassword, oldPassword }, currentUser: { id } }) => {
      await authService.changePassword({
        userId: id,
        oldPassword,
        newPassword,
      });
      return castToRes(null);
    },
    {
      body: ChangePasswordRequestDto,
      response: {
        200: ResWrapper(t.Null()),
        ...authErrors,
      },
      detail: {
        summary: 'Change password',
        description: 'Change password',
        security: ACCESS_AUTH,
      },
    },
  )
  .post(
    '/forgot-password',
    async ({ body: { newPassword, otp, otpToken } }) => {
      await authService.forgotPassword({
        otpToken,
        otp,
        newPassword,
      });
      return castToRes(null);
    },
    {
      body: ForgotPasswordRequestDto,
      response: {
        200: ResWrapper(t.Null()),
        ...authErrors,
      },
      detail: {
        summary: 'Confirm forgot password',
        description: 'Confirm forgot password',
        security: ACCESS_AUTH,
      },
    },
  );

export const userAuthController = new Elysia({
  prefix: '/auth/user',
  tags: ['user-auth'],
})
  .use(reqMeta)
  .post(
    '/register',
    async ({ body: { email, password } }) => {
      const result = await authService.register({
        email,
        password,
      });
      return castToRes(result);
    },
    {
      body: RegisterRequestDto,
      detail: {
        description: 'Register with email and password',
        summary: 'Register a new user',
      },
      response: {
        200: ResWrapper(OtpResDto),
        400: ErrorResDto,
        500: ErrorResDto,
      },
    },
  )
  .post(
    '/verify-account',
    async ({ body: { otp, otpToken } }) => {
      await authService.verifyAccount({
        otpToken,
        otp,
      });
      return castToRes(null);
    },
    {
      body: VerifyAccountRequestDto,
      detail: {
        description: 'Verify account with OTP and OTP token',
        summary: 'Verify account',
      },
      response: {
        200: ResWrapper(t.Null()),
        400: ErrorResDto,
        500: ErrorResDto,
      },
    },
  );
