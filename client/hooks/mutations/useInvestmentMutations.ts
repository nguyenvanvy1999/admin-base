import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import type {
  InvestmentContributionFormData,
  InvestmentFormData,
  InvestmentTradeFormData,
  InvestmentValuationFormData,
} from '@client/types/investment';
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
    mutationFn: async (data: Omit<InvestmentFormData, 'id'>) => {
      const response = await api.api.investments.post(data);

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to create investment',
        );
      }

      return response.data;
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
    mutationFn: async (data: InvestmentFormData) => {
      if (!data.id) {
        throw new Error('Investment ID is required for update');
      }

      const response = await api.api.investments.post(data);

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to update investment',
        );
      }

      return response.data;
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
    mutationFn: async ({ investmentId, data }: TradeMutationVariables) => {
      const response = await api.api
        .investments({ investmentId })
        .trades.post(data);

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to create trade',
        );
      }

      return response.data;
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
    mutationFn: async ({
      investmentId,
      data,
    }: ContributionMutationVariables) => {
      const response = await api.api
        .investments({ investmentId })
        .contributions.post(data);

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to create contribution',
        );
      }

      return response.data;
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
    mutationFn: async ({ investmentId, data }: ValuationMutationVariables) => {
      const response = await api.api
        .investments({ investmentId })
        .valuations.post(data);

      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'Failed to save valuation',
        );
      }

      return response.data;
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
