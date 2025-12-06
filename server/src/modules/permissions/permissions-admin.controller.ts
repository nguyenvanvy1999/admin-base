import { Elysia, t } from 'elysia';
import { permissionService } from 'src/service/admin';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import { castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const permissionsAdminController = new Elysia({
  prefix: '/admin/permissions',
  tags: [DOC_TAG.ADMIN_PERMISSION],
})
  .use(authCheck)
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
  );
