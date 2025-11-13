import { transactionService } from '@client/services';
import { toast } from '@client/utils/toast';
import type { IUpsertTransaction } from '@server/dto/transaction.dto';
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
