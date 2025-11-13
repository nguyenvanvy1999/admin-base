import { transactionService } from '@client/services';
import { toast } from '@client/utils/toast';
import type {
  IBalanceAdjustmentDto,
  IBatchTransactionsDto,
  IUpsertTransaction,
} from '@server/dto/transaction.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUpsertTransaction, 'id'>) => {
      return transactionService.createTransaction(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction created successfully');
    },
  });
};

export const useUpdateTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IUpsertTransaction) => {
      if (!data.id) {
        throw new Error('Transaction ID is required for update');
      }

      return transactionService.updateTransaction(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['transaction'] });
      toast.success('Transaction updated successfully');
    },
  });
};

export const useDeleteTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => {
      return transactionService.deleteTransaction(transactionId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction deleted successfully');
    },
  });
};

export const useAdjustBalanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IBalanceAdjustmentDto) => {
      return transactionService.adjustBalance(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Balance adjusted successfully');
    },
  });
};

export const useCreateBatchTransactionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: IBatchTransactionsDto) => {
      return transactionService.createBatchTransactions(data);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });

      const { summary } = response;
      if (summary.failed === 0) {
        toast.success(
          `Successfully created ${summary.successful} transaction(s)`,
        );
      } else {
        toast.warning(
          `Created ${summary.successful} transaction(s), ${summary.failed} failed`,
        );
      }
    },
  });
};
