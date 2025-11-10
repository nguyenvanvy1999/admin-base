import useToast from '@client/hooks/useToast';
import { del, post } from '@client/libs/http';
import type { AccountFormData } from '@client/types/account';
import type {
  AccountDeleteResponse,
  AccountResponse,
} from '@server/src/dto/account.dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateAccountMutation = () => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<AccountFormData, 'id'>) => {
      return await post<AccountResponse, Omit<AccountFormData, 'id'>>(
        '/api/accounts',
        data,
      );
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
    mutationFn: async (data: AccountFormData) => {
      if (!data.id) {
        throw new Error('Account ID is required for update');
      }

      return await post<AccountResponse, AccountFormData>(
        '/api/accounts',
        data,
      );
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
      return await del<AccountDeleteResponse>(`/api/accounts/${accountId}`);
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
