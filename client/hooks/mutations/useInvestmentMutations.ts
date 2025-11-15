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

export const useDeleteManyInvestmentsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => {
      return investmentService.deleteManyInvestments(ids);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investments deleted successfully');
    },
  });
};

export const useDeleteManyInvestmentTradesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      tradeIds,
    }: {
      investmentId: string;
      tradeIds: string[];
    }) => {
      return investmentService.deleteManyTrades(investmentId, tradeIds);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-trades', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      toast.success('Trades deleted successfully');
    },
  });
};

export const useDeleteManyInvestmentContributionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      contributionIds,
    }: {
      investmentId: string;
      contributionIds: string[];
    }) => {
      return investmentService.deleteManyContributions(
        investmentId,
        contributionIds,
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['investment-contributions', variables.investmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['investment-position', variables.investmentId],
      });
      toast.success('Contributions deleted successfully');
    },
  });
};

export const useDeleteManyInvestmentValuationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      investmentId,
      valuationIds,
    }: {
      investmentId: string;
      valuationIds: string[];
    }) => {
      return investmentService.deleteManyValuations(investmentId, valuationIds);
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
      toast.success('Valuations deleted successfully');
    },
  });
};
