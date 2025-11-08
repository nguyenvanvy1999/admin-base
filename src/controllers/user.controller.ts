import { UserRole } from '@server/generated/prisma/enums';
import { Elysia, t } from 'elysia';
import authMacro from '../macros/auth';
import userService from '../services/user.service';

const userController = new Elysia().group('/users', (group) =>
  group
    .use(userService)
    .use(authMacro)
    .post(
      '/register',
      async ({ body, userService }) => {
        return await userService.register(body.username, body.password);
      },
      {
        detail: {
          tags: ['User'],
        },
        body: t.Object({
          username: t.String(),
          password: t.String({ minLength: 6 }),
          name: t.Optional(t.String()),
        }),
      },
    )
    .post(
      '/login',
      async ({ body, userService }) => {
        return await userService.login(body.username, body.password);
      },
      {
        detail: {
          tags: ['User'],
        },
        body: t.Object({
          username: t.String(),
          password: t.String(),
        }),
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
        if (body.newPassword && !body.oldPassword) {
          throw new Error('Old password is required to change password');
        }
        return await userService.updateProfile(user.id, {
          name: body.name,
          baseCurrencyId: body.baseCurrencyId,
          oldPassword: body.oldPassword,
          newPassword: body.newPassword,
        });
      },
      {
        checkAuth: [UserRole.user],
        detail: {
          tags: ['User'],
          security: [{ JwtAuth: [] }],
        },
        body: t.Object({
          name: t.Optional(t.String()),
          baseCurrencyId: t.Optional(t.String()),
          oldPassword: t.Optional(t.String()),
          newPassword: t.Optional(t.String({ minLength: 6 })),
        }),
      },
    ),
);

export default userController;
