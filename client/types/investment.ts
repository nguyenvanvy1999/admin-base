import type { Currency } from '@server/dto/currency.dto';
import type {
  ContributionType,
  InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';

export type InvestmentFull = {
  id: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  mode: InvestmentMode;
  currencyId: string;
  baseCurrencyId: string | null;
  currency: Currency;
  baseCurrency: Currency | null;
  extra: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentFormData = {
  id?: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  mode: InvestmentMode;
  currencyId: string;
  baseCurrencyId?: string;
  extra?: Record<string, unknown> | null;
};

export type InvestmentPosition = {
  quantity: number | null;
  avgCost: number | null;
  costBasis: number;
  realizedPnl: number;
  unrealizedPnl: number;
  lastPrice: number | null;
  lastValue: number | null;
  lastValuationAt: string | null;
  netContributions: number;
  costBasisInBaseCurrency?: number;
  realizedPnlInBaseCurrency?: number;
  unrealizedPnlInBaseCurrency?: number;
  lastValueInBaseCurrency?: number | null;
  currentExchangeRate?: number | null;
  exchangeRateGainLoss?: number | null;
};

export type InvestmentTrade = {
  id: string;
  userId: string;
  investmentId: string;
  accountId: string;
  account: {
    id: string;
    name: string;
  };
  side: TradeSide;
  timestamp: string;
  price: string;
  quantity: string;
  amount: string;
  fee: string;
  currencyId: string;
  currency: Currency;
  transactionId: string | null;
  priceCurrency: string | null;
  priceInBaseCurrency: string | null;
  amountInBaseCurrency: string | null;
  exchangeRate: string | null;
  baseCurrencyId: string | null;
  baseCurrency: Currency | null;
  priceSource: string | null;
  priceFetchedAt: string | null;
  meta: Record<string, unknown> | null;
};

export type InvestmentTradeFormData = {
  side: TradeSide;
  timestamp: string;
  price: number;
  quantity: number;
  amount: number;
  fee?: number;
  currencyId: string;
  accountId: string;
  transactionId?: string;
  priceCurrency?: string;
  priceInBaseCurrency?: number;
  amountInBaseCurrency?: number;
  exchangeRate?: number;
  baseCurrencyId?: string;
  priceSource?: string;
  priceFetchedAt?: string;
  meta?: Record<string, unknown> | null;
};

export type InvestmentContribution = {
  id: string;
  userId: string;
  investmentId: string;
  accountId: string | null;
  account: {
    id: string;
    name: string;
  } | null;
  amount: string;
  currencyId: string;
  currency: Currency;
  type: ContributionType;
  amountInBaseCurrency: string | null;
  exchangeRate: string | null;
  baseCurrencyId: string | null;
  baseCurrency: Currency | null;
  timestamp: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentContributionFormData = {
  amount: number;
  currencyId: string;
  type: ContributionType;
  timestamp: string;
  accountId?: string;
  note?: string;
  amountInBaseCurrency?: number;
  exchangeRate?: number;
  baseCurrencyId?: string;
};

export type InvestmentValuation = {
  id: string;
  userId: string;
  investmentId: string;
  currencyId: string;
  currency: Currency;
  price: string;
  priceInBaseCurrency: string | null;
  exchangeRate: string | null;
  baseCurrencyId: string | null;
  baseCurrency: Currency | null;
  timestamp: string;
  source: string | null;
  fetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentValuationFormData = {
  price: number;
  currencyId: string;
  timestamp: string;
  source?: string;
  fetchedAt?: string;
  priceInBaseCurrency?: number;
  exchangeRate?: number;
  baseCurrencyId?: string;
};
