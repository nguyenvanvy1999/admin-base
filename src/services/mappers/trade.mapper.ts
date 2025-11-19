import type { Prisma } from '@server/generated';
import type { TRADE_SELECT_FULL } from '../selects';

export const mapTrade = (
  trade: Prisma.InvestmentTradeGetPayload<{
    select: typeof TRADE_SELECT_FULL;
  }>,
) => ({
  ...trade,
  timestamp: trade.timestamp.toISOString(),
  price: trade.price.toNumber(),
  quantity: trade.quantity.toNumber(),
  amount: trade.amount.toNumber(),
  fee: trade.fee.toNumber(),
  priceInBaseCurrency: trade.priceInBaseCurrency?.toNumber() ?? null,
  amountInBaseCurrency: trade.amountInBaseCurrency?.toNumber() ?? null,
  exchangeRate: trade.exchangeRate?.toNumber() ?? null,
  priceFetchedAt: trade.priceFetchedAt?.toISOString() ?? null,
  created: trade.created.toISOString(),
  modified: trade.modified.toISOString(),
});
