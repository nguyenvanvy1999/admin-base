import { t } from 'elysia';

export const ExchangeRateInfoDto = t.NoValidate(
  t.Object({
    date: t.Nullable(t.String()),
    fetchedAt: t.Nullable(t.Number()),
    isCacheValid: t.Boolean(),
  }),
);

export const ExchangeRateRefreshResponseDto = t.NoValidate(
  t.Object({
    success: t.Boolean(),
    message: t.String(),
    date: t.Nullable(t.String()),
    fetchedAt: t.Nullable(t.Number()),
  }),
);

export const ExchangeRateHealthDto = t.NoValidate(
  t.Object({
    status: t.String(),
    apiUrl: t.String(),
    lastFetch: t.Nullable(t.Number()),
    cacheDate: t.Nullable(t.String()),
    isCacheValid: t.Boolean(),
  }),
);

export type ExchangeRateInfo = typeof ExchangeRateInfoDto.static;
export type ExchangeRateRefreshResponse =
  typeof ExchangeRateRefreshResponseDto.static;
export type ExchangeRateHealth = typeof ExchangeRateHealthDto.static;
