import { Elysia, t } from 'elysia';
import { authCheck } from 'src/service/auth/auth.middleware';
import { authorize, has } from 'src/service/auth/authorization';
import { i18nService } from 'src/service/i18n.service';
import {
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  ResWrapper,
} from 'src/share';
import {
  I18nPaginationDto,
  I18nUpsertDto,
  PaginateI18nResDto,
} from './i18n.dto';

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
    },
  })
  .use(authorize(has('I18N.UPDATE')))
  .post(
    '/',
    async ({ body }) => {
      const result = await i18nService.upsert(body);
      return castToRes(result);
    },
    {
      body: I18nUpsertDto,
      response: {
        200: ResWrapper(t.Object({ id: t.String() })),
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
  );
