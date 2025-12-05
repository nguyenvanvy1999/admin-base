import { Elysia, t } from 'elysia';
import {
  ImportSettingsDto,
  SettingResDto,
  UpdateSettingDto,
} from 'src/modules/admin/dtos';
import { settingAdminService } from 'src/service/admin';
import { authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  ResWrapper,
} from 'src/share';

export const adminSettingController = new Elysia<'admin-setting', AppAuthMeta>({
  tags: [DOC_TAG.ADMIN_SETTING],
}).group('/settings', (app) =>
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
    .get(
      '/export',
      async () => {
        const result = await settingAdminService.export();
        return castToRes(result);
      },
      {
        response: {
          200: ResWrapper(t.Record(t.String(), t.String())),
        },
      },
    )
    .use(authorize(has('SETTING.UPDATE')))
    .post(
      '/import',
      async ({ body }) => {
        await settingAdminService.import(body);
        return castToRes(null);
      },
      {
        body: ImportSettingsDto,
        response: {
          200: ResWrapper(t.Null()),
          400: ErrorResDto,
          ...authErrors,
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
);
