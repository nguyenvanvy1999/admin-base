import { t } from 'elysia';

export const CurrencyResDto = t.Object({
  id: t.String(),
  code: t.String(),
  name: t.String(),
  symbol: t.Nullable(t.String()),
  isActive: t.Boolean(),
});

export type Currency = typeof CurrencyResDto.static;
