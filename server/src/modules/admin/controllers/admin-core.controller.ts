import { Elysia, t } from 'elysia';
import {
  I18nPaginationDto,
  I18nUpsertDto,
  PaginateI18nResDto,
  PaginateRoleResDto,
  RoleDetailResDto,
  RolePaginationDto,
  SessionPaginateDto,
  SessionPagingResDto,
  SettingResDto,
  UpdateSettingDto,
  UpsertRoleDto,
} from 'src/modules/admin/dtos';
import { i18nService } from 'src/service/admin/i18n.service';
import { permissionService } from 'src/service/admin/permission.service';
import { roleService } from 'src/service/admin/role.service';
import { settingAdminService } from 'src/service/admin/setting-admin.service';
import {
  allOf,
  anyOf,
  authorize,
  has,
  isSelf,
} from 'src/service/auth/authorization';
import { sessionService } from 'src/service/auth/session.service';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const adminCoreController = new Elysia<'admin-core', AppAuthMeta>({
  tags: [
    DOC_TAG.ADMIN_I18N,
    DOC_TAG.ADMIN_ROLE,
    DOC_TAG.ADMIN_PERMISSION,
    DOC_TAG.ADMIN_SETTING,
    DOC_TAG.ADMIN_SESSION,
  ],
})
  .group('/i18n', (app) =>
    app
      .use(authorize(has('I18N.VIEW')))
      .get('/', async ({ query }) => castToRes(await i18nService.list(query)), {
        query: I18nPaginationDto,
        response: {
          200: ResWrapper(PaginateI18nResDto),
        },
      })
      .use(authorize(has('I18N.UPDATE')))
      .post(
        '/',
        async ({ body }) => {
          await i18nService.upsert(body);
          return castToRes(null);
        },
        {
          body: I18nUpsertDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ResWrapper(t.Null()),
          },
        },
      )
      .post(
        '/del',
        async ({ body }) => {
          await i18nService.delete(body);
          return castToRes(null);
        },
        {
          body: IdsDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ResWrapper(t.Null()),
          },
        },
      )
      .post(
        '/import',
        async ({ body }) => {
          await i18nService.import(body);
          return castToRes(null);
        },
        {
          body: t.Object({
            file: t.File({ format: 'application/vnd.ms-excel' }),
          }),
          response: {
            200: ResWrapper(t.Null()),
            400: ResWrapper(t.Null()),
          },
        },
      )
      .get(
        '/export',
        () => {
          return i18nService.export();
        },
        {
          response: {
            400: ResWrapper(t.Null()),
          },
        },
      ),
  )
  .group('/roles', (app) =>
    app
      .use(authorize(has('ROLE.VIEW')))
      .get('/', async ({ query }) => castToRes(await roleService.list(query)), {
        query: RolePaginationDto,
        response: {
          200: ResWrapper(PaginateRoleResDto),
        },
      })
      .get(
        '/:id',
        async ({ params: { id } }) => {
          const result = await roleService.detail(id);
          return castToRes(result);
        },
        {
          params: IdDto,
          response: {
            200: ResWrapper(RoleDetailResDto),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      )
      .use(authorize(has('ROLE.UPDATE')))
      .post(
        '/',
        async ({ body }) => {
          await roleService.upsert(body);
          return castToRes(null);
        },
        {
          body: UpsertRoleDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ResWrapper(t.Null()),
          },
        },
      )
      .use(authorize(allOf(has('ROLE.UPDATE'), has('ROLE.DELETE'))))
      .post(
        '/del',
        async ({ body }) => {
          await roleService.delete(body);
          return castToRes(null);
        },
        {
          body: IdsDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ResWrapper(t.Null()),
          },
        },
      ),
  )
  .group('/permissions', (app) =>
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
  )
  .group('/settings', (app) =>
    app
      .use(authorize(has('SETTING.VIEW')))
      .get(
        '/',
        async () => {
          const result = await settingAdminService.list();
          return castToRes(result);
        },
        {
          response: {
            200: ResWrapper(t.Array(SettingResDto)),
          },
        },
      )
      .use(authorize(has('SETTING.UPDATE')))
      .post(
        '/:id',
        async ({ body, params: { id } }) => {
          await settingAdminService.update({ ...body, id });
          return castToRes(null);
        },
        {
          body: UpdateSettingDto,
          params: IdDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      ),
  )
  .group('/sessions', (app) =>
    app
      .use(authorize(anyOf(has('SESSION.VIEW_ALL'), has('SESSION.VIEW'))))
      .get(
        '/',
        async ({ currentUser, query }) => {
          const result = await sessionService.list({
            ...query,
            currentUserId: currentUser.id,
            hasViewAllPermission:
              currentUser.permissions.includes('SESSION.VIEW_ALL'),
          });
          return castToRes(result);
        },
        {
          query: SessionPaginateDto,
          response: {
            200: ResWrapper(SessionPagingResDto),
            ...authErrors,
          },
        },
      )
      .use(
        authorize(
          anyOf(
            has('SESSION.REVOKE_ALL'),
            allOf(
              has('SESSION.REVOKE'),
              isSelf(
                (c) =>
                  (c.resource as { createdById: string } | undefined)
                    ?.createdById ?? '',
              ),
            ),
          ),
          {
            load: {
              resource: ({ params }: { params: Record<string, string> }) =>
                sessionService.loadSessionById(params['id']),
            },
          },
        ),
      )
      .post(
        '/:id/revoke',
        async ({ params: { id }, currentUser }) => {
          await sessionService.revoke(currentUser.id, [id]);
          return castToRes(null);
        },
        {
          params: IdDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      ),
  );
