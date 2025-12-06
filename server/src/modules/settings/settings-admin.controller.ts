import { Elysia, t } from 'elysia';
import { settingAdminService } from 'src/service/admin';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  ResWrapper,
} from 'src/share';
import {
  ImportSettingsDto,
  SettingResDto,
  UpdateSettingDto,
} from './settings.dto';

export const settingsAdminController = new Elysia({
  prefix: '/admin/settings',
  tags: [DOC_TAG.ADMIN_SETTING],
})
  .use(authCheck)
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
  );
