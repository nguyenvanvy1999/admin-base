import useToast from '@client/hooks/useToast';
import { del, post } from '@client/libs/http';
import type { TransactionFormData } from '@client/types/transaction';
import type {
  TransactionDeleteResponse,
  TransactionDetail,
} from '@server/src/dto/transaction.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateTransactionMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TransactionFormData, 'id'>) => {
      const payload = {
        ...data,
        note: data.note ?? undefined,
        entityId: data.entityId ?? undefined,
        metadata: data.metadata ?? undefined,
      };
      return await post<TransactionDetail, typeof payload>(
        '/api/transactions',
        payload,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccess('Transaction created successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useUpdateTransactionMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!data.id) {
        throw new Error('Transaction ID is required for update');
      }

      const payload = {
        ...data,
        note: data.note ?? undefined,
        entityId: data.entityId ?? undefined,
        metadata: data.metadata ?? undefined,
      };
      return await post<TransactionDetail, typeof payload>(
        '/api/transactions',
        payload,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['transaction'] });
      showSuccess('Transaction updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useDeleteTransactionMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      return await del<TransactionDeleteResponse>(
        `/api/transactions/${transactionId}`,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccess('Transaction deleted successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
