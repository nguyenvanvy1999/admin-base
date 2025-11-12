import { investmentService } from '@client/services';
import { toast } from '@client/utils/toast';
import type { ICreateInvestmentContributionDto } from '@server/dto/contribution.dto';
import type { IUpsertInvestmentDto } from '@server/dto/investment.dto';
import type { ICreateInvestmentTradeDto } from '@server/dto/trade.dto';
import type { IUpsertInvestmentValuationDto } from '@server/dto/valuation.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type TradeMutationVariables = {
  investmentId: string;
  data: ICreateInvestmentTradeDto;
};

type ContributionMutationVariables = {
  investmentId: string;
  data: ICreateInvestmentContributionDto;
};

type ValuationMutationVariables = {
  investmentId: string;
  data: IUpsertInvestmentValuationDto;
};

export const useCreateInvestmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertInvestmentDto, 'id'>) => {
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
    mutationFn: (data: IUpsertInvestmentDto) => {
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

export const useDeleteInvestmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (investmentId: string) => {
      return investmentService.deleteInvestment(investmentId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investment deleted successfully');
    },
  });
};

export const useDeleteInvestmentTradeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      tradeId,
    }: {
      investmentId: string;
      tradeId: string;
    }) => {
      return investmentService.deleteTrade(investmentId, tradeId);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-trades', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      toast.success('Trade deleted successfully');
    },
  });
};

export const useDeleteInvestmentContributionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      contributionId,
    }: {
      investmentId: string;
      contributionId: string;
    }) => {
      return investmentService.deleteContribution(investmentId, contributionId);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-contributions', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      toast.success('Contribution deleted successfully');
    },
  });
};

export const useDeleteInvestmentValuationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      valuationId,
    }: {
      investmentId: string;
      valuationId: string;
    }) => {
      return investmentService.deleteValuation(investmentId, valuationId);
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
      toast.success('Valuation deleted successfully');
    },
  });
};
