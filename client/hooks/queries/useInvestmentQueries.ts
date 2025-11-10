import { get } from '@client/libs/http';
import type {
  InvestmentContribution,
  InvestmentFull,
  InvestmentPosition,
  InvestmentTrade,
  InvestmentValuation,
} from '@client/types/investment';
import type {
  InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';
import type { InvestmentContributionListResponse } from '@server/src/dto/contribution.dto';
import type {
  InvestmentListResponse,
  InvestmentPositionResponse,
  InvestmentResponse,
} from '@server/src/dto/investment.dto';
import type { InvestmentTradeListResponse } from '@server/src/dto/trade.dto';
import type {
  InvestmentValuationListResponse,
  InvestmentValuationResponse,
} from '@server/src/dto/valuation.dto';
import { useQuery } from '@tanstack/react-query';

type ListInvestmentsQuery = {
  assetTypes?: InvestmentAssetType[];
  modes?: InvestmentMode[];
  currencyIds?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

type ListTradesQuery = {
  side?: TradeSide;
  accountIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
};

type ListContributionsQuery = {
  accountIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
};

type ListValuationsQuery = {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
};

const normalizeDate = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

const normalizeDecimal = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String(value);
  }
  return String(value);
};

export const useInvestmentsQuery = (query: ListInvestmentsQuery = {}) => {
  return useQuery({
    queryKey: ['investments', query],
    queryFn: async () => {
      const data = await get<InvestmentListResponse>('/api/investments', {
        query,
      });

      return {
        investments: data.investments.map((investment) => ({
          ...investment,
          extra:
            investment.extra && typeof investment.extra === 'object'
              ? (investment.extra as Record<string, unknown>)
              : null,
          createdAt: normalizeDate(investment.createdAt) ?? '',
          updatedAt: normalizeDate(investment.updatedAt) ?? '',
        })) satisfies InvestmentFull[],
        pagination: data.pagination,
      };
    },
  });
};

export const useInvestmentQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment', investmentId],
    queryFn: async () => {
      const investment = await get<InvestmentResponse>(
        `/api/investments/${investmentId}`,
      );

      return {
        ...investment,
        extra:
          investment.extra && typeof investment.extra === 'object'
            ? (investment.extra as Record<string, unknown>)
            : null,
        createdAt: normalizeDate(investment.createdAt) ?? '',
        updatedAt: normalizeDate(investment.updatedAt) ?? '',
      } satisfies InvestmentFull;
    },
  });
};

export const useInvestmentPositionQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment-position', investmentId],
    queryFn: async () => {
      const position = await get<InvestmentPositionResponse>(
        `/api/investments/${investmentId}/holdings`,
      );

      return {
        quantity:
          position.quantity === null || position.quantity === undefined
            ? null
            : Number(position.quantity),
        avgCost:
          position.avgCost === null || position.avgCost === undefined
            ? null
            : Number(position.avgCost),
        costBasis: Number(position.costBasis),
        realizedPnl: Number(position.realizedPnl),
        unrealizedPnl: Number(position.unrealizedPnl),
        lastPrice:
          position.lastPrice === null || position.lastPrice === undefined
            ? null
            : Number(position.lastPrice),
        lastValue:
          position.lastValue === null || position.lastValue === undefined
            ? null
            : Number(position.lastValue),
        lastValuationAt: normalizeDate(position.lastValuationAt),
        netContributions: Number(position.netContributions),
      } satisfies InvestmentPosition;
    },
  });
};

export const useInvestmentTradesQuery = (
  investmentId: string,
  query: ListTradesQuery = {},
) => {
  return useQuery({
    queryKey: ['investment-trades', investmentId, query],
    queryFn: async () => {
      const data = await get<InvestmentTradeListResponse>(
        `/api/investments/${investmentId}/trades`,
        { query },
      );

      return {
        trades: data.trades.map((trade) => ({
          ...trade,
          timestamp: normalizeDate(trade.timestamp) ?? '',
          price: normalizeDecimal(trade.price) ?? '0',
          quantity: normalizeDecimal(trade.quantity) ?? '0',
          amount: normalizeDecimal(trade.amount) ?? '0',
          fee: normalizeDecimal(trade.fee) ?? '0',
          priceInBaseCurrency: normalizeDecimal(trade.priceInBaseCurrency),
          priceFetchedAt: normalizeDate(trade.priceFetchedAt),
          meta:
            trade.meta && typeof trade.meta === 'object'
              ? (trade.meta as Record<string, unknown>)
              : null,
        })) satisfies InvestmentTrade[],
        pagination: data.pagination,
      };
    },
  });
};

export const useInvestmentContributionsQuery = (
  investmentId: string,
  query: ListContributionsQuery = {},
) => {
  return useQuery({
    queryKey: ['investment-contributions', investmentId, query],
    queryFn: async () => {
      const data = await get<InvestmentContributionListResponse>(
        `/api/investments/${investmentId}/contributions`,
        { query },
      );

      return {
        contributions: data.contributions.map((contribution) => ({
          ...contribution,
          amount: normalizeDecimal(contribution.amount) ?? '0',
          timestamp: normalizeDate(contribution.timestamp) ?? '',
          createdAt: normalizeDate(contribution.createdAt) ?? '',
          updatedAt: normalizeDate(contribution.updatedAt) ?? '',
        })) satisfies InvestmentContribution[],
        pagination: data.pagination,
      };
    },
  });
};

export const useInvestmentValuationsQuery = (
  investmentId: string,
  query: ListValuationsQuery = {},
) => {
  return useQuery({
    queryKey: ['investment-valuations', investmentId, query],
    queryFn: async () => {
      const data = await get<InvestmentValuationListResponse>(
        `/api/investments/${investmentId}/valuations`,
        { query },
      );

      return {
        valuations: data.valuations.map((valuation) => ({
          ...valuation,
          price: normalizeDecimal(valuation.price) ?? '0',
          timestamp: normalizeDate(valuation.timestamp) ?? '',
          fetchedAt: normalizeDate(valuation.fetchedAt),
          createdAt: normalizeDate(valuation.createdAt) ?? '',
          updatedAt: normalizeDate(valuation.updatedAt) ?? '',
        })) satisfies InvestmentValuation[],
        pagination: data.pagination,
      };
    },
  });
};

export const useLatestInvestmentValuationQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment-latest-valuation', investmentId],
    queryFn: async () => {
      const valuation = await get<InvestmentValuationResponse | null>(
        `/api/investments/${investmentId}/valuations/latest`,
      );

      if (!valuation) {
        return null;
      }

      return {
        ...valuation,
        price: normalizeDecimal(valuation.price) ?? '0',
        timestamp: normalizeDate(valuation.timestamp) ?? '',
        fetchedAt: normalizeDate(valuation.fetchedAt),
        createdAt: normalizeDate(valuation.createdAt) ?? '',
        updatedAt: normalizeDate(valuation.updatedAt) ?? '',
      } satisfies InvestmentValuation;
    },
  });
};
