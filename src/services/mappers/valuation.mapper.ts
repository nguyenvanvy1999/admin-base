import type { Prisma } from '@server/generated';
import type { VALUATION_SELECT_FULL } from '../selects';

export const mapValuation = (
  valuation: Prisma.InvestmentValuationGetPayload<{
    select: typeof VALUATION_SELECT_FULL;
  }>,
) => ({
  ...valuation,
  price: valuation.price.toNumber(),
  timestamp: valuation.timestamp.toISOString(),
  fetchedAt: valuation.fetchedAt?.toISOString() ?? null,
  priceInBaseCurrency: valuation.priceInBaseCurrency?.toNumber() ?? null,
  exchangeRate: valuation.exchangeRate?.toNumber() ?? null,
  created: valuation.created.toISOString(),
  modified: valuation.modified.toISOString(),
});
