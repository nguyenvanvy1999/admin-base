import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import {
  AuthUserDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  UpdateProfileDto,
} from '../dto/user.dto';
import authMacro from '../macros/auth';
import userService from '../services/user.service';
import { castToRes, ResWrapper } from '../share';

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
      .use(userService)
      .use(authMacro)
      .post(
        '/register',
        async ({ body, userService }) => {
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
        async ({ body, userService }) => {
          return castToRes(await userService.login(body));
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
      .get(
        '/me',
        async ({ user, userService }) => {
          return castToRes(await userService.getUserInfo(user.id));
        },
        {
          checkAuth: [UserRole.user],
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
        async ({ user, body, userService }) => {
          return castToRes(await userService.updateProfile(user.id, body));
        },
        {
          checkAuth: [UserRole.user],
          detail: {
            ...USER_DETAIL_AUTH,
            summary: 'Update user profile',
            description:
              "Update the authenticated user's profile information such as username, email, or other profile fields.",
          },
          body: UpdateProfileDto,
          response: {
            200: ResWrapper(AuthUserDto),
          },
        },
      ),
);

export default userController;
