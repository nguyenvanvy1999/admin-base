import { t } from 'elysia';

export const CurrencyDto = t.Object({
  id: t.String(),
  name: t.String(),
  code: t.String(),
  symbol: t.Nullable(t.String()),
});

export const CurrencyListResponseDto = t.Array(CurrencyDto);

export type Currency = typeof CurrencyDto.static;
export type CurrencyListResponse = typeof CurrencyListResponseDto.static;
