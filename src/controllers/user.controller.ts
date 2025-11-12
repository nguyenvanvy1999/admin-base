import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import {
  CurrentUserResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  UpdateProfileDto,
  UpdateProfileResponseDto,
} from '../dto/user.dto';
import authMacro from '../macros/auth';
import userService from '../services/user.service';

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
        ({ body, userService }) => {
          return userService.register(body);
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
            200: RegisterResponseDto,
          },
        },
      )
      .post(
        '/login',
        ({ body, userService }) => {
          return userService.login(body);
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
            200: LoginResponseDto,
          },
        },
      )
      .get(
        '/me',
        ({ user, userService }) => {
          return userService.getUserInfo(user.id);
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
            200: CurrentUserResponseDto,
          },
        },
      )
      .put(
        '/profile',
        ({ user, body, userService }) => {
          return userService.updateProfile(user.id, body);
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
            200: UpdateProfileResponseDto,
          },
        },
      ),
);

export default userController;
