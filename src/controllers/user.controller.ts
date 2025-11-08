import { UserRole } from '@server/generated/prisma/enums';
import { Elysia } from 'elysia';
import { LoginDto, RegisterDto, UpdateProfileDto } from '../dto/user.dto';
import authMacro from '../macros/auth';
import userService from '../services/user.service';

const userController = new Elysia().group('/users', (group) =>
  group
    .use(userService)
    .use(authMacro)
    .post(
      '/register',
      async ({ body, userService }) => {
        return await userService.register(body);
      },
      {
        detail: {
          tags: ['User'],
        },
        body: RegisterDto,
      },
    )
    .post(
      '/login',
      async ({ body, userService }) => {
        return await userService.login(body);
      },
      {
        detail: {
          tags: ['User'],
        },
        body: LoginDto,
      },
    )
    .get(
      '/me',
      async ({ user, userService }) => {
        return await userService.getUserInfo(user.id);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['User'],
          security: [{ JwtAuth: [] }],
        },
      },
    )
    .put(
      '/profile',
      async ({ user, body, userService }) => {
        return await userService.updateProfile(user.id, body);
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['User'],
          security: [{ JwtAuth: [] }],
        },
        body: UpdateProfileDto,
      },
    ),
);

export default userController;
