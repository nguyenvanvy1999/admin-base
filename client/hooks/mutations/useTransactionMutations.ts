import { transactionService } from '@client/services';
import type { TransactionFormData } from '@client/types/transaction';
import { toast } from '@client/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TransactionFormData, 'id'>) => {
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
    mutationFn: (data: TransactionFormData) => {
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
