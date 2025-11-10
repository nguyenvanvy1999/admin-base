import {
  InvestmentAssetType,
  InvestmentMode,
} from '@server/generated/prisma/enums';
import { t } from 'elysia';

export const UpsertInvestmentDto = t.Object({
  id: t.Optional(t.String()),
  symbol: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  assetType: t.Enum(InvestmentAssetType),
  mode: t.Optional(t.Enum(InvestmentMode)),
  currencyId: t.String(),
  extra: t.Optional(t.Any()),
});

export const ListInvestmentsQueryDto = t.Object({
  assetTypes: t.Optional(t.Array(t.Enum(InvestmentAssetType))),
  modes: t.Optional(t.Array(t.Enum(InvestmentMode))),
  currencyIds: t.Optional(t.Array(t.String())),
  search: t.Optional(t.String()),
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, default: 20 })),
  sortBy: t.Optional(
    t.Union([
      t.Literal('name'),
      t.Literal('createdAt'),
      t.Literal('updatedAt'),
    ]),
  ),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

export type IUpsertInvestmentDto = typeof UpsertInvestmentDto.static;
export type IListInvestmentsQueryDto = typeof ListInvestmentsQueryDto.static;
