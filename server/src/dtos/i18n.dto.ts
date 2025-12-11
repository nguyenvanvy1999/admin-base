import { Type } from '@sinclair/typebox';
import { t } from 'elysia';
import { PaginatedDto, PaginationReqDto } from 'src/share';

export const I18nDto = t.Object({
  id: t.String(),
  key: t.String(),
  en: t.Nullable(t.String()),
  vi: t.Nullable(t.String()),
});

export const PaginateI18nResDto = PaginatedDto(I18nDto);

export const I18nPaginationDto = t.Intersect([
  PaginationReqDto,
  t.Object({
    key: t.Optional(t.String()),
  }),
]);

export const I18nUpsertDto = t.Intersect([
  t.Omit(I18nDto, ['id']),
  t.Object({ id: t.Optional(t.String()) }),
]);

export const I18nImportDto = Type.Object({
  KEY: Type.String(),
  EN: Type.Optional(Type.String()),
  ZH: Type.Optional(Type.String()),
  KO: Type.Optional(Type.String()),
  VI: Type.Optional(Type.String()),
});

export type I18nListParams = typeof I18nPaginationDto.static;
export type I18nUpsertParams = typeof I18nUpsertDto.static;
export type I18nImportRow = typeof I18nImportDto.static;
