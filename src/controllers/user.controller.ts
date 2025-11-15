import { prisma } from '@server/configs/db';
import { UserRole } from '@server/generated';
import {
  authCheck,
  userResSelect,
} from '@server/services/auth/auth.middleware';
import { userUtilService } from '@server/services/auth/auth-util.service';
import { tokenService } from '@server/services/auth/token.service';
import { ErrorCode, throwAppError } from '@server/share';
import dayjs from 'dayjs';
import { Elysia, t } from 'elysia';
import {
  AuthUserDto,
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  UpdateProfileDto,
} from '../dto/user.dto';
import { userService } from '../services/user.service';
import { castToRes, ResWrapper, SUPER_ADMIN_ID } from '../share';
import type { ITokenPayload } from '../share/type';

const USER_DETAIL = {
  tags: ['User'],
};

const USER_DETAIL_AUTH = {
  tags: ['User'],
  security: [{ JwtAuth: [] }],
};

const userController = new Elysia().group(
  '/users',
  {
    detail: {
      tags: ['User'],
      description:
        'User management endpoints for registration, authentication, and profile management.',
    },
  },
  (group) =>
    group
      .post(
        '/register',
        async ({ body }) => {
          return castToRes(await userService.register(body));
        },
        {
          detail: {
            ...USER_DETAIL,
            summary: 'Register new user',
            description:
              'Create a new user account with username, email, and password. Returns user information and authentication token upon successful registration.',
          },
          body: RegisterDto,
          response: {
            200: ResWrapper(AuthUserDto),
          },
        },
      )
      .post(
        '/login',
        async ({ body, request, headers }) => {
          const clientIp =
            headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            headers['x-real-ip'] ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            'unknown';
          const userAgent = headers['user-agent'] || 'unknown';
          return castToRes(
            await userService.login(body, clientIp as string, userAgent),
          );
        },
        {
          detail: {
            ...USER_DETAIL,
            summary: 'User login',
            description:
              'Authenticate a user with username/email and password. Returns user information and JWT token for subsequent authenticated requests.',
          },
          body: LoginDto,
          response: {
            200: ResWrapper(LoginResponseDto),
          },
        },
      )
      .post(
        '/refresh-token',
        async ({ body, request, headers }) => {
          const clientIp =
            headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            headers['x-real-ip'] ||
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            'unknown';
          const userAgent = headers['user-agent'] || 'unknown';

          const session = await prisma.session.findFirst({
            where: { token: body.token },
            select: {
              revoked: true,
              id: true,
              expired: true,
              userId: true,
            },
          });

          if (!session || session.revoked || new Date() > session.expired) {
            throwAppError(ErrorCode.EXPIRED_TOKEN, 'Token expired');
          }

          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: userResSelect,
          });

          if (!user) {
            throwAppError(ErrorCode.USER_NOT_FOUND, 'User not found');
          }

          const payload: ITokenPayload = {
            userId: user.id,
            timestamp: Date.now(),
            sessionId: session.id,
            clientIp,
            userAgent,
          };

          const { accessToken, expirationTime } =
            await tokenService.createAccessToken(payload);

          const permissions = await userUtilService.getPermissions(user);

          return castToRes({
            accessToken,
            refreshToken: body.token,
            exp: expirationTime.getTime(),
            expired: dayjs(expirationTime).format(),
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: UserRole.user,
              baseCurrencyId: user.baseCurrencyId,
              permissions,
              roleIds: user.roles.map((r) => r.roleId),
              isSuperAdmin: user.id === SUPER_ADMIN_ID,
            },
          });
        },
        {
          detail: {
            ...USER_DETAIL,
            summary: 'Refresh access token',
            description:
              'Issues a new access token using a valid refresh token.',
          },
          body: t.Object({
            token: t.String({ minLength: 1 }),
          }),
          response: {
            200: ResWrapper(LoginResponseDto),
          },
        },
      )
      .use(authCheck)
      .get(
        '/me',
        async ({ currentUser }) => {
          return castToRes(await userService.getUserInfo(currentUser.id));
        },
        {
          detail: {
            ...USER_DETAIL_AUTH,
            summary: 'Get current user info',
            description:
              "Retrieve the authenticated user's profile information including username, email, and account details.",
          },
          response: {
            200: ResWrapper(AuthUserDto),
          },
        },
      )
      .put(
        '/profile',
        async ({ currentUser, body }) => {
          return castToRes(
            await userService.updateProfile(currentUser.id, body),
          );
        },
        {
          detail: {
            ...USER_DETAIL_AUTH,
            summary: 'Update user profile',
            description:
              "Update the authenticated user's profile information such as name and base currency.",
          },
          body: UpdateProfileDto,
          response: {
            200: ResWrapper(AuthUserDto),
          },
        },
      )
      .post(
        '/change-password',
        async ({ currentUser, body }) => {
          return castToRes(
            await userService.changePassword(currentUser.id, body),
          );
        },
        {
          detail: {
            ...USER_DETAIL_AUTH,
            summary: 'Change user password',
            description:
              "Change the authenticated user's password. Requires old password verification.",
          },
          body: ChangePasswordDto,
          response: {
            200: ResWrapper(AuthUserDto),
          },
        },
      ),
);

export default userController;
