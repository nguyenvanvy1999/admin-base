import { Elysia, t } from 'elysia';
import { permissionService } from 'src/service/admin';
import { authorize, has } from 'src/service/auth/authorization';
import { type AppAuthMeta, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const adminPermissionController = new Elysia<
  'admin-permission',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_PERMISSION],
}).group('/permissions', (app) =>
  app
    .use(authorize(has('ROLE.VIEW')))
    .get(
      '/',
      async ({ query }) => castToRes(await permissionService.list(query)),
      {
        query: t.Object({ roleId: t.Optional(t.String()) }),
        response: {
          200: ResWrapper(
            t.Array(
              t.Object({
                id: t.String(),
                description: t.Nullable(t.String()),
                title: t.String(),
              }),
            ),
          ),
        },
      },
    ),
);
