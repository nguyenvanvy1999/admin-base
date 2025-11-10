import type {
  InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';
import type { Currency } from './account';

export type InvestmentFull = {
  id: string;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  mode: InvestmentMode;
  currencyId: string;
  currency: Currency;
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
  timestamp: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentContributionFormData = {
  amount: number;
  currencyId: string;
  timestamp: string;
  accountId?: string;
  note?: string;
};

export type InvestmentValuation = {
  id: string;
  userId: string;
  investmentId: string;
  currencyId: string;
  currency: Currency;
  price: string;
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
};
