import { Elysia, t } from 'elysia';
import {
  ImportSettingsDto,
  SettingResDto,
  UpdateSettingDto,
} from 'src/dtos/settings.dto';
import { authCheck, authorize, has } from 'src/services/auth';
import { settingsService } from 'src/services/settings/settings.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdDto,
  ResWrapper,
} from 'src/share';

export const settingsAdminController = new Elysia({
  prefix: '/admin/settings',
  tags: [DOC_TAG.ADMIN_SETTING],
})
  .use(authCheck)
  .use(authorize(has('SETTING.VIEW')))
  .get(
    '/',
    async () => {
      const result = await settingsService.list();
      return castToRes(result);
    },
    {
      response: {
        200: ResWrapper(t.Array(SettingResDto)),
        ...authErrors,
      },
    },
  )
  .get(
    '/export',
    async () => {
      const result = await settingsService.export();
      return castToRes(result);
    },
    {
      response: {
        200: ResWrapper(t.Record(t.String(), t.String())),
        ...authErrors,
      },
    },
  )
  .use(authorize(has('SETTING.UPDATE')))
  .post(
    '/import',
    async ({ body }) => {
      await settingsService.import(body);
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
      await settingsService.update({ ...body, id });
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
