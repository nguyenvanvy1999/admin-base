import useToast from '@client/hooks/useToast';
import { post } from '@client/libs/http';
import type {
  InvestmentContributionFormData,
  InvestmentFormData,
  InvestmentTradeFormData,
  InvestmentValuationFormData,
} from '@client/types/investment';
import type { InvestmentContributionResponse } from '@server/dto/contribution.dto';
import type { InvestmentResponse } from '@server/dto/investment.dto';
import type { InvestmentTradeResponse } from '@server/dto/trade.dto';
import type { InvestmentValuationResponse } from '@server/dto/valuation.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type TradeMutationVariables = {
  investmentId: string;
  data: InvestmentTradeFormData;
};

type ContributionMutationVariables = {
  investmentId: string;
  data: InvestmentContributionFormData;
};

type ValuationMutationVariables = {
  investmentId: string;
  data: InvestmentValuationFormData;
};

const handleError =
  (showError: (message: string) => void) => (error: Error) => {
    showError(error.message);
  };

export const useCreateInvestmentMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InvestmentFormData, 'id'>) => {
      return post<InvestmentResponse, Omit<InvestmentFormData, 'id'>>(
        '/api/investments',
        data,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      showSuccess('Investment created successfully');
    },
    onError: handleError(showError),
  });
};

export const useUpdateInvestmentMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvestmentFormData) => {
      if (!data.id) {
        throw new Error('Investment ID is required for update');
      }

      return post<InvestmentResponse, InvestmentFormData>(
        '/api/investments',
        data,
      );
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      if (result?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['investment', result.id],
        });
      }
      showSuccess('Investment updated successfully');
    },
    onError: handleError(showError),
  });
};

export const useCreateInvestmentTradeMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, data }: TradeMutationVariables) => {
      return post<InvestmentTradeResponse, InvestmentTradeFormData>(
        `/api/investments/${investmentId}/trades`,
        data,
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-trades', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      showSuccess('Trade recorded successfully');
    },
    onError: handleError(showError),
  });
};

export const useCreateInvestmentContributionMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, data }: ContributionMutationVariables) => {
      return post<
        InvestmentContributionResponse,
        InvestmentContributionFormData
      >(`/api/investments/${investmentId}/contributions`, data);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-contributions', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      showSuccess('Contribution recorded successfully');
    },
    onError: handleError(showError),
  });
};

export const useUpsertInvestmentValuationMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, data }: ValuationMutationVariables) => {
      return post<InvestmentValuationResponse, InvestmentValuationFormData>(
        `/api/investments/${investmentId}/valuations`,
        data,
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-valuations', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-latest-valuation', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      showSuccess('Valuation saved successfully');
    },
    onError: handleError(showError),
  });
};
