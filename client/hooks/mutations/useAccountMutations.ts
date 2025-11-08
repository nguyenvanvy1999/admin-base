import useToast from '@client/hooks/useToast';
import { api } from '@client/libs/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UpsertAccountData = {
  id?: string;
  type: string;
  name: string;
  currencyId: string;
  creditLimit?: number;
  expiryDate?: string;
  meta?: any;
};

export const useCreateAccountMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<UpsertAccountData, 'id'>) => {
      const response = await api.api.accounts.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showSuccess('Account created successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useUpdateAccountMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpsertAccountData) => {
      if (!data.id) {
        throw new Error('Account ID is required for update');
      }

      const response = await api.api.accounts.post(data);
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['account'] });
      showSuccess('Account updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};

export const useDeleteAccountMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await api.api.accounts[accountId].delete();
      if (response.error) {
        throw new Error(
          response.error.value?.message ?? 'An unknown error occurred',
        );
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showSuccess('Account deleted successfully');
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });
};
