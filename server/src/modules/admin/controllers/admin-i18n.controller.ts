import { Elysia, t } from 'elysia';
import {
  I18nPaginationDto,
  I18nUpsertDto,
  PaginateI18nResDto,
} from 'src/modules/admin/dtos';
import { i18nService } from 'src/service/admin';
import { authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  castToRes,
  DOC_TAG,
  IdsDto,
  ResWrapper,
} from 'src/share';

export const adminI18nController = new Elysia<'admin-i18n', AppAuthMeta>({
  tags: [DOC_TAG.ADMIN_I18N],
}).group('/i18n', (app) =>
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
);
