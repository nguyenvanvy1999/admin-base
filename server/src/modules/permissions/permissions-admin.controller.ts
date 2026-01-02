import { Elysia, t } from 'elysia';
import { authCheck, authorize, has } from 'src/services/auth';
import { rolesService } from 'src/services/roles/roles.service';
import { authErrors, castToRes, DOC_TAG, ResWrapper } from 'src/share';

export const permissionsAdminController = new Elysia({
  prefix: '/admin/permissions',
  tags: [DOC_TAG.ADMIN_PERMISSION],
})
  .use(authCheck)
  .use(authorize(has('ROLE.VIEW')))
  .get(
    '/',
    async ({ query }) => castToRes(await rolesService.listPermissions(query)),
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
        ...authErrors,
      },
    },
  );
