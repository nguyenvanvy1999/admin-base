import { Elysia, t } from 'elysia';
import { reqMeta } from 'src/config/request';
import {
  ChangePasswordRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  LoginResDto,
  LoginResponseDto,
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
    async ({ body: { email, password }, clientIp, userAgent }) => {
      const result = await authService.login({
        email,
        password,
        clientIp,
        userAgent,
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
    '/refresh-token',
    async ({ clientIp, userAgent, body: { token } }) => {
      const result = await authService.refreshToken({
        token,
        clientIp,
        userAgent,
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
    async ({ currentUser, clientIp, userAgent }) => {
      await authService.logout({
        userId: currentUser.id,
        sessionId: currentUser.sessionId,
        clientIp,
        userAgent,
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
    async ({ currentUser, clientIp, userAgent }) => {
      await authService.logoutAll({
        userId: currentUser.id,
        sessionId: currentUser.sessionId,
        clientIp,
        userAgent,
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
      const result = await authService.register({ email, password });
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
    async ({ body: { otp, otpToken }, clientIp, userAgent }) => {
      await authService.verifyAccount({
        otpToken,
        otp,
        clientIp,
        userAgent,
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
