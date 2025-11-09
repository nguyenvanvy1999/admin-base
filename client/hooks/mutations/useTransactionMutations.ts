import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import type { TransactionFormData } from '@client/types/transaction';
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
      const response = await api.api.transactions.post(payload);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
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
      const response = await api.api.transactions.post(payload);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
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
      const response = await api.api
        .transactions({ id: transactionId })
        .delete();
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
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
