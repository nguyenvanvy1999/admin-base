import { Elysia, t } from 'elysia';
import {
  I18nPaginationDto,
  I18nUpsertDto,
  PaginateI18nResDto,
} from 'src/dtos/i18n.dto';
import { authCheck, authorize, has } from 'src/services/auth';
import { i18nService } from 'src/services/i18n';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const i18nAdminController = new Elysia({
  prefix: '/admin/i18n',
  tags: [DOC_TAG.ADMIN_I18N],
})
  .use(authCheck)
  .use(authorize(has('I18N.VIEW')))
  .get('/', async ({ query }) => castToRes(await i18nService.list(query)), {
    query: I18nPaginationDto,
    response: {
      200: ResWrapper(PaginateI18nResDto),
      ...authErrors,
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
        400: ErrorResDto,
        ...authErrors,
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
        400: ErrorResDto,
        ...authErrors,
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
        400: ErrorResDto,
        ...authErrors,
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
        400: ErrorResDto,
        ...authErrors,
      },
    },
  );
