import { investmentService } from '@client/services';
import type {
  InvestmentContributionFormData,
  InvestmentFormData,
  InvestmentTradeFormData,
  InvestmentValuationFormData,
} from '@client/types/investment';
import { toast } from '@client/utils/toast';
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

export const useCreateInvestmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<InvestmentFormData, 'id'>) => {
      return investmentService.createInvestment(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investment created successfully');
    },
  });
};

export const useUpdateInvestmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvestmentFormData) => {
      if (!data.id) {
        throw new Error('Investment ID is required for update');
      }

      return investmentService.updateInvestment(data);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      if (result?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['investment', result.id],
        });
      }
      toast.success('Investment updated successfully');
    },
  });
};

export const useCreateInvestmentTradeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, data }: TradeMutationVariables) => {
      return investmentService.createTrade(investmentId, data);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-trades', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      toast.success('Trade recorded successfully');
    },
  });
};

export const useCreateInvestmentContributionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, data }: ContributionMutationVariables) => {
      return investmentService.createContribution(investmentId, data);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-contributions', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      toast.success('Contribution recorded successfully');
    },
  });
};

export const useUpsertInvestmentValuationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investmentId, data }: ValuationMutationVariables) => {
      return investmentService.upsertValuation(investmentId, data);
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
      toast.success('Valuation saved successfully');
    },
  });
};
