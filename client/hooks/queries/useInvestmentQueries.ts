import { get } from '@client/libs/http';
import type { InvestmentContributionListResponse } from '@server/dto/contribution.dto';
import type {
  InvestmentListResponse,
  InvestmentPositionResponse,
  InvestmentResponse,
} from '@server/dto/investment.dto';
import type { InvestmentTradeListResponse } from '@server/dto/trade.dto';
import type {
  InvestmentValuationListResponse,
  InvestmentValuationResponse,
} from '@server/dto/valuation.dto';
import type {
  InvestmentAssetType,
  InvestmentMode,
  TradeSide,
} from '@server/generated/prisma/enums';
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

export const useInvestmentsQuery = (query: ListInvestmentsQuery = {}) => {
  return useQuery({
    queryKey: ['investments', query],
    queryFn: () => {
      return get<InvestmentListResponse>('/api/investments', {
        query,
      });
    },
  });
};

export const useInvestmentQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment', investmentId],
    queryFn: () => {
      return get<InvestmentResponse>(`/api/investments/${investmentId}`);
    },
  });
};

export const useInvestmentPositionQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment-position', investmentId],
    queryFn: () => {
      return get<InvestmentPositionResponse>(
        `/api/investments/${investmentId}/holdings`,
      );
    },
  });
};

export const useInvestmentTradesQuery = (
  investmentId: string,
  query: ListTradesQuery = {},
) => {
  return useQuery({
    queryKey: ['investment-trades', investmentId, query],
    queryFn: () => {
      return get<InvestmentTradeListResponse>(
        `/api/investments/${investmentId}/trades`,
        { query },
      );
    },
  });
};

export const useInvestmentContributionsQuery = (
  investmentId: string,
  query: ListContributionsQuery = {},
) => {
  return useQuery({
    queryKey: ['investment-contributions', investmentId, query],
    queryFn: () => {
      return get<InvestmentContributionListResponse>(
        `/api/investments/${investmentId}/contributions`,
        { query },
      );
    },
  });
};

export const useInvestmentValuationsQuery = (
  investmentId: string,
  query: ListValuationsQuery = {},
) => {
  return useQuery({
    queryKey: ['investment-valuations', investmentId, query],
    queryFn: () => {
      return get<InvestmentValuationListResponse>(
        `/api/investments/${investmentId}/valuations`,
        { query },
      );
    },
  });
};

export const useLatestInvestmentValuationQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment-latest-valuation', investmentId],
    queryFn: () => {
      return get<InvestmentValuationResponse | null>(
        `/api/investments/${investmentId}/valuations/latest`,
      );
    },
  });
};
