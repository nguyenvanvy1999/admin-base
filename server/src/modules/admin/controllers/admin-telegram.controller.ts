import { Elysia, t } from 'elysia';
import {
  PaginateTeleBotResDto,
  PaginateTeleChatResDto,
  PaginateTeleTemplateResDto,
  SendTelegramMessageDto,
  SendTemplateDto,
  UpsertTeleBotDto,
  UpsertTeleChatDto,
  UpsertTeleTemplateDto,
} from 'src/modules/admin/dtos';
import { telegramAdminService } from 'src/service/admin/telegram-admin.service';
import { allOf, authorize, has } from 'src/service/auth/authorization';
import {
  type AppAuthMeta,
  authErrors,
  castToRes,
  DOC_TAG,
  ErrorResDto,
  IdsDto,
  PaginationReqDto,
  ResWrapper,
} from 'src/share';

export const adminTelegramController = new Elysia<
  'admin-telegram',
  AppAuthMeta
>({
  tags: [DOC_TAG.ADMIN_TELEGRAM],
})
  .group('/telegram-bots', (app) =>
    app
      .use(authorize(has('TELE_BOT.VIEW')))
      .get(
        '/',
        async ({ query }) => {
          const result = await telegramAdminService.listBots(query);
          return castToRes(result);
        },
        {
          query: PaginationReqDto,
          response: {
            200: ResWrapper(PaginateTeleBotResDto),
            ...authErrors,
          },
        },
      )
      .use(authorize(has('TELE_BOT.UPDATE')))
      .post(
        '/',
        async ({ body }) => {
          await telegramAdminService.upsertBot(body);
          return castToRes(null);
        },
        {
          body: UpsertTeleBotDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      )
      .use(authorize(has('TELE_BOT.DELETE')))
      .post(
        '/del',
        async ({ body: { ids } }) => {
          await telegramAdminService.deleteBots({ ids });
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
      ),
  )
  .group('/telegram-chats', (app) =>
    app
      .use(authorize(has('TELE_CHAT.VIEW')))
      .get(
        '/',
        async ({ query }) => {
          const result = await telegramAdminService.listChats(query);
          return castToRes(result);
        },
        {
          query: PaginationReqDto,
          response: {
            200: ResWrapper(PaginateTeleChatResDto),
            ...authErrors,
          },
        },
      )
      .use(authorize(has('TELE_CHAT.UPDATE')))
      .post(
        '/',
        async ({ body }) => {
          await telegramAdminService.upsertChat(body);
          return castToRes(null);
        },
        {
          body: UpsertTeleChatDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      )
      .use(authorize(has('TELE_CHAT.DELETE')))
      .post(
        '/del',
        async ({ body: { ids } }) => {
          await telegramAdminService.deleteChats({ ids });
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
      ),
  )
  .group('/telegram-templates', (app) =>
    app
      .use(authorize(has('TELE_TEMPLATE.VIEW')))
      .get(
        '/',
        async ({ query }) => {
          const result = await telegramAdminService.listTemplates(query);
          return castToRes(result);
        },
        {
          query: PaginationReqDto,
          response: {
            200: ResWrapper(PaginateTeleTemplateResDto),
            ...authErrors,
          },
        },
      )
      .use(authorize(has('TELE_TEMPLATE.UPDATE')))
      .post(
        '/',
        async ({ body }) => {
          await telegramAdminService.upsertTemplate(body);
          return castToRes(null);
        },
        {
          body: UpsertTeleTemplateDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      )
      .use(authorize(has('TELE_TEMPLATE.DELETE')))
      .post(
        '/del',
        async ({ body: { ids } }) => {
          await telegramAdminService.deleteTemplates({ ids });
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
      .use(authorize(has('TELE_TEMPLATE.SEND')))
      .post(
        '/send',
        async ({ body }) => {
          await telegramAdminService.sendTemplate(body);
          return castToRes(null);
        },
        {
          body: SendTemplateDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      )
      .use(authorize(allOf(has('TELE_TEMPLATE.SEND'), has('TELE_CHAT.VIEW'))))
      .post(
        '/manual-send',
        async ({ body }) => {
          await telegramAdminService.sendManual(body);
          return castToRes(null);
        },
        {
          body: SendTelegramMessageDto,
          response: {
            200: ResWrapper(t.Null()),
            400: ErrorResDto,
            ...authErrors,
          },
        },
      ),
  );
