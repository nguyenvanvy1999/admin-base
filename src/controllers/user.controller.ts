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
        checkAuth: ['user'],
        detail: {
          tags: ['User'],
          security: [{ JwtAuth: [] }],
        },
      },
    )
    .get(
      '/admin',
      ({ user }) => {
        return user;
      },
      {
        checkAuth: ['admin'],
        detail: {
          tags: ['User'],
          security: [{ JwtAuth: [] }],
        },
      },
    ),
);

export default userController;
