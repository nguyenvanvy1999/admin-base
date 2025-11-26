import { t } from 'elysia';
import { TeleChatType } from 'src/generated';
import { PaginatedDto } from 'src/share';

export const UpsertTeleBotDto = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  token: t.String(),
  enabled: t.Boolean(),
  description: t.Optional(t.String()),
});

const TeleBotResDto = t.Intersect([
  t.Omit(UpsertTeleBotDto, ['description']),
  t.Object({ description: t.Nullable(t.String()) }),
]);

export const PaginateTeleBotResDto = PaginatedDto(TeleBotResDto);

export const UpsertTeleChatDto = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  description: t.Optional(t.String()),
  chatId: t.String(),
  type: t.Enum(TeleChatType),
});

const TeleChatResDto = t.Intersect([
  t.Omit(UpsertTeleChatDto, ['description']),
  t.Object({ description: t.Nullable(t.String()) }),
]);

export const PaginateTeleChatResDto = PaginatedDto(TeleChatResDto);

export const UpsertTeleTemplateDto = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  description: t.Optional(t.String()),
  message: t.Optional(t.String()),
  photos: t.Optional(t.Array(t.String())),
  videos: t.Optional(t.Array(t.String())),
  buttons: t.Optional(t.Any()),
});

const TeleTemplateResDto = t.Intersect([
  t.Omit(UpsertTeleTemplateDto, ['description', 'message']),
  t.Object({
    description: t.Nullable(t.String()),
    message: t.Nullable(t.String()),
  }),
]);

export const PaginateTeleTemplateResDto = PaginatedDto(TeleTemplateResDto);

export const SendTemplateDto = t.Object({
  telegramTemplateId: t.String(),
  telegramChatIds: t.Array(t.String(), { minItems: 1 }),
  telegramBotId: t.Optional(t.String()),
});

export const SendTelegramMessageDto = t.Composite([
  t.Omit(UpsertTeleTemplateDto, ['id', 'name', 'description']),
  t.Object({
    telegramBotId: t.Optional(t.String()),
    chatIds: t.Array(t.String(), { minItems: 1 }),
  }),
]);
