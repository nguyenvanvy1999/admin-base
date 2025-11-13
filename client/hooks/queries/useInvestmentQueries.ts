import type { FormComponentRef } from '@client/components/FormComponent';
import { investmentService } from '@client/services';
import { DeferredPromise } from '@open-draft/deferred-promise';
import {
  InvestmentAssetType,
  InvestmentMode,
  type TradeSide,
} from '@server/generated/prisma/enums';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const filterSchema = z.object({
  search: z.string().optional(),
  assetTypes: z.array(z.enum(InvestmentAssetType)).optional(),
  modes: z.array(z.enum(InvestmentMode)).optional(),
  currencyIds: z.array(z.string()).optional(),
});

export type FilterFormValue = z.infer<typeof filterSchema>;

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

export const useInvestmentsQuery = (
  queryParams: {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  },
  formRef: React.RefObject<FormComponentRef | null>,
  handleSubmit: (
    onValid: (data: FilterFormValue) => void,
    onInvalid?: (errors: any) => void,
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>,
) => {
  return useQuery({
    queryKey: ['investments', queryParams],
    queryFn: async () => {
      let query: ListInvestmentsQuery = {
        ...queryParams,
      };

      if (formRef.current) {
        const valueDeferred = new DeferredPromise<FilterFormValue>();
        formRef.current.submit(
          handleSubmit(valueDeferred.resolve, valueDeferred.reject),
        );

        const criteria = await valueDeferred;

        query = {
          ...query,
          search: criteria.search?.trim() || undefined,
          assetTypes:
            criteria.assetTypes && criteria.assetTypes.length > 0
              ? (criteria.assetTypes as InvestmentAssetType[])
              : undefined,
          modes:
            criteria.modes && criteria.modes.length > 0
              ? (criteria.modes as InvestmentMode[])
              : undefined,
          currencyIds:
            criteria.currencyIds && criteria.currencyIds.length > 0
              ? criteria.currencyIds
              : undefined,
        };
      }

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
