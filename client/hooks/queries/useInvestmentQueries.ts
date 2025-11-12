import { investmentService } from '@client/services';
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
      return investmentService.listInvestments(query);
    },
  });
};

export const useInvestmentQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment', investmentId],
    queryFn: () => {
      return investmentService.getInvestment(investmentId);
    },
  });
};

export const useInvestmentPositionQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment-position', investmentId],
    queryFn: () => {
      return investmentService.getInvestmentPosition(investmentId);
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
      return investmentService.listTrades(investmentId, query);
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
      return investmentService.listContributions(investmentId, query);
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
      return investmentService.listValuations(investmentId, query);
    },
  });
};

export const useLatestInvestmentValuationQuery = (investmentId: string) => {
  return useQuery({
    queryKey: ['investment-latest-valuation', investmentId],
    queryFn: () => {
      return investmentService.getLatestValuation(investmentId);
    },
  });
};
