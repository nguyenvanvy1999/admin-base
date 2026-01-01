import { Elysia, t } from 'elysia';
import {
  ChangePasswordRequestDto,
  DisableMfaRequestDto,
  ForgotPasswordRequestDto,
  LoginResDto,
  OtpResDto,
  RefreshTokenRequestDto,
  RegenerateBackupCodesResponseDto,
  RegisterRequestDto,
  UserResDto,
  VerifyAccountRequestDto,
} from 'src/dtos/auth.dto';
import { authCheck } from 'src/services/auth';
import { authService } from 'src/services/auth/core/auth.service';
import { authFlowService } from 'src/services/auth/core/auth-flow.service';
import { authUserService } from 'src/services/auth/core/auth-user.service';
import { rateLimit } from 'src/services/rate-limit/auth-rate-limit.config';
import {
  ACCESS_AUTH,
  authErrors,
  castToRes,
  ErrorResDto,
  ResWrapper,
} from 'src/share';

const authRateLimitedRoutes = new Elysia()
  .use(rateLimit())
  .post(
    '/refresh-token',
    async ({ body }) => castToRes(await authService.refreshToken(body)),
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
  .post(
    '/forgot-password',
    async ({ body }) => {
      await authService.forgotPassword(body);
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

const authRateLimitedProtectedRoutes = new Elysia()
  .use(rateLimit())
  .use(authCheck)
  .post(
    '/change-password',
    async ({ body, currentUser: { id } }) => {
      await authService.changePassword({ userId: id, ...body });
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
  );

const authProtectedRoutes = new Elysia()
  .use(authCheck)
  .post(
    '/logout',
    async ({ currentUser }) => {
      await authService.logout(currentUser);
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
      await authService.logoutAll(currentUser);
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
      const user = await authUserService.loadUserWithPermissions(
        currentUser.id,
      );
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
    '/mfa/backup-codes/regenerate',
    async ({ currentUser }) => {
      return castToRes(
        await authFlowService.regenerateBackupCodes(currentUser.id),
      );
    },
    {
      response: {
        200: ResWrapper(RegenerateBackupCodesResponseDto),
        ...authErrors,
      },
      detail: {
        summary: 'Regenerate MFA backup codes',
        description:
          'Invalidates old backup codes and returns a new set. Requires MFA to be enabled.',
        security: ACCESS_AUTH,
      },
    },
  )
  .post(
    '/mfa/disable',
    async ({ body, currentUser }) => {
      await authFlowService.disableMfa({
        userId: currentUser.id,
        ...body,
      });
      return castToRes(null);
    },
    {
      body: DisableMfaRequestDto,
      response: {
        200: ResWrapper(t.Null()),
        ...authErrors,
      },
      detail: {
        summary: 'Disable MFA',
        description:
          'Disable MFA for the current user. Requires password and TOTP code.',
        security: ACCESS_AUTH,
      },
    },
  );

export const authController = new Elysia({
  prefix: '/auth',
  tags: ['auth'],
})
  .use(authRateLimitedRoutes)
  .use(authRateLimitedProtectedRoutes)
  .use(authProtectedRoutes);

const userAuthRateLimitedRoutes = new Elysia()
  .use(rateLimit())
  .post(
    '/register',
    async ({ body }) => castToRes(await authService.register(body)),
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
    async ({ body }) => {
      await authService.verifyAccount(body);
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

export const userAuthController = new Elysia({
  prefix: '/auth/user',
  tags: ['user-auth'],
}).use(userAuthRateLimitedRoutes);
